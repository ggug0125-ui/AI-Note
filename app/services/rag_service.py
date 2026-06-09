"""
Starter RAG service.

This module provides a simple class `RAGService` that can:
- extract text from uploaded PDF files
- create embeddings using OpenAI via LangChain
- persist a ChromaDB vectorstore and run similarity searches

The implementation is intentionally minimal to serve as a starter that
you can extend for production use (chunking, error handling, async I/O, etc.).
"""
import json
import os
from typing import Any, Dict, List, Optional

from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from pypdf import PdfReader


class RAGService:
    """Simple RAG service using LangChain + Chroma + OpenAI embeddings.

    Args:
        persist_directory: where Chroma will persist its DB files.
        openai_api_key: optional API key (falls back to env var).
    """

    def __init__(self, persist_directory: str = "./chroma_db", openai_api_key: Optional[str] = None):
        self.persist_directory = persist_directory
        os.makedirs(self.persist_directory, exist_ok=True)

        # Use OpenAI embeddings via LangChain
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.embeddings: Optional[OpenAIEmbeddings] = None
        self.chat_model: Optional[ChatOpenAI] = None

        # Vectorstore will be created on ingest. Keep reference for searches.
        self.vectorstore: Optional[Chroma] = None

    def _get_embeddings(self) -> OpenAIEmbeddings:
        """Create the OpenAI embeddings client only when it is first needed."""
        if self.embeddings is None:
            api_key = self.openai_api_key or os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY is required to create embeddings.")
            self.embeddings = OpenAIEmbeddings(api_key=api_key)
        return self.embeddings

    def _get_chat_model(self) -> ChatOpenAI:
        """Create the OpenAI chat client only when it is first needed."""
        if self.chat_model is None:
            api_key = self.openai_api_key or os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY is required to generate answers.")
            self.chat_model = ChatOpenAI(
                api_key=api_key,
                model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
                temperature=0,
            )
        return self.chat_model

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract raw text from a PDF file using pypdf."""
        reader = PdfReader(pdf_path)
        parts: List[str] = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts)

    def split_text(self, text: str) -> List[str]:
        """Split extracted text into chunks for retrieval."""
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        return splitter.split_text(text)

    def ingest_documents(
        self,
        texts: List[str],
        collection_name: str = "noteflow",
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """Create embeddings from texts and persist to ChromaDB.

        This uses LangChain's `Chroma.from_texts` helper to build a vectorstore.
        For larger documents you should chunk text before creating embeddings.
        """
        # Create or overwrite vectorstore for the provided collection
        self.vectorstore = Chroma.from_texts(
            texts,
            embedding=self._get_embeddings(),
            metadatas=metadatas,
            persist_directory=self.persist_directory,
            collection_name=collection_name,
        )
        # Chroma persists automatically when persist_directory is provided.

    def _get_vectorstore(self, collection_name: str = "noteflow") -> Chroma:
        """Load the persisted Chroma collection."""
        if not self.vectorstore:
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self._get_embeddings(),
                collection_name=collection_name,
            )
        return self.vectorstore

    def delete_documents_by_file_id(self, file_id: str, collection_name: str = "noteflow") -> int:
        """Delete chunks from ChromaDB that were ingested for a file."""
        vectorstore = Chroma(
            persist_directory=self.persist_directory,
            collection_name=collection_name,
        )
        collection = vectorstore._collection
        matching = collection.get(where={"file_id": file_id})
        ids = matching.get("ids", [])
        if not ids:
            return 0

        collection.delete(ids=ids)

        # Drop the cached vectorstore so the next query sees the updated collection.
        self.vectorstore = None
        return len(ids)

    def similarity_search(self, query: str, k: int = 4, collection_name: str = "noteflow") -> List[dict]:
        """Run a similarity search against the persisted vectorstore.

        Returns a list of result dicts with text and score (if available).
        """
        docs = self._get_vectorstore(collection_name).similarity_search(query, k=k)
        results = []
        for d in docs:
            results.append({"text": d.page_content, "metadata": d.metadata})
        return results

    def answer_question(
        self,
        question: str,
        k: int = 4,
        collection_name: str = "noteflow",
        file_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Retrieve relevant chunks and generate an answer from their context."""
        search_kwargs: Dict[str, Any] = {"k": k}
        if file_id:
            search_kwargs["filter"] = {"file_id": file_id}

        docs_with_scores = self._get_vectorstore(collection_name).similarity_search_with_score(
            question,
            **search_kwargs,
        )
        sources = [
            {
                "text": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score),
            }
            for doc, score in docs_with_scores
        ]

        if not sources:
            return {
                "answer": "I could not find relevant context in the noteflow collection.",
                "sources": [],
            }

        context = "\n\n".join(
            f"Source {index + 1}:\n{source['text']}"
            for index, source in enumerate(sources)
        )
        prompt = (
            "Answer the user's question using only the context below. "
            "If the context does not contain the answer, say you do not know.\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {question}"
        )
        response = self._get_chat_model().invoke(prompt)

        return {
            "answer": response.content,
            "sources": sources,
        }

    def summarize_text(self, text: str, summary_type: str) -> str:
        """Generate a Korean summary for the requested summary style."""
        clipped_text = text[:12000]
        prompt = (
            "다음 문서를 한국어로 요약하세요. "
            "요청한 요약 유형에 맞춰 간결하고 실무적으로 작성하세요.\n\n"
            f"요약 유형: {summary_type}\n\n"
            f"문서:\n{clipped_text}"
        )
        response = self._get_chat_model().invoke(prompt)
        return str(response.content)

    def extract_keywords_from_text(self, text: str, count: int, scope: str) -> Dict[str, List[str]]:
        """Extract keywords and topics as structured JSON."""
        clipped_text = text[:12000]
        prompt = (
            "다음 문서에서 핵심 키워드와 상위 토픽을 한국어로 추출하세요. "
            "반드시 JSON만 반환하세요. 형식: "
            '{"keywords":["키워드"],"topics":["토픽"]}\n\n'
            f"키워드 개수: {count}\n"
            f"분석 범위: {scope}\n\n"
            f"문서:\n{clipped_text}"
        )
        response = self._get_chat_model().invoke(prompt)
        content = str(response.content).strip()

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            keywords = [
                item.strip(" -•\n\t")
                for item in content.replace("\n", ",").split(",")
                if item.strip(" -•\n\t")
            ][:count]
            return {"keywords": keywords, "topics": []}

        keywords = parsed.get("keywords", [])
        topics = parsed.get("topics", [])
        return {
            "keywords": [str(item) for item in keywords][:count],
            "topics": [str(item) for item in topics],
        }
