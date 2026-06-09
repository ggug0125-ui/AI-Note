# 📄 AI Note (NoteFlow AI)

AI Note(NoteFlow AI)는 PDF 문서를 업로드하여 AI 기반 문서 분석, 자동 요약, 키워드 추출, 문서 질의응답(RAG), 파일 변환 기능을 제공하는 AI 문서 분석 SaaS 프로젝트입니다.

---

# 🚀 주요 기능

## 👤 사용자 인증

* 회원가입
* 로그인
* JWT 인증
* 로그인 유지
* 로그아웃
* 보호된 대시보드 접근

---

## 📄 AI 문서 어시스턴트

* PDF 업로드
* 파일 목록 조회
* 문서 선택
* 문서 기반 질의응답
* 출처(Source) 표시
* 문서 삭제

---

## 📊 PDF 문서 분석

* 문서 상태 분석
* 텍스트 길이 확인
* Chunk 개수 확인
* 처리 상태 확인

---

## 📝 AI 자동 요약

지원 요약 유형

* 핵심 요약
* 회의록 요약
* 보고서 요약
* 액션 아이템 요약

---

## 🔑 키워드 추출

* 핵심 키워드 추출
* 토픽 추출
* 키워드 개수 조절
* 분석 범위 설정

---

## 💬 AI 문서 채팅 (RAG)

* 문서 기반 질문
* 관련 문서 검색
* ChromaDB 유사도 검색
* OpenAI 응답 생성

---

## 📚 작업 기록

* 요약 결과 저장
* 키워드 결과 저장
* 질문/답변 저장
* 문서별 이력 조회
* 결과 삭제

---

## 🔄 파일 변환

### 지원 형식

Excel (.xlsx, .xls)

→ CSV

Excel (.xlsx, .xls)

→ PDF

HWPX

→ TXT

### 지원 예정

* HWP → TXT

---

# 🏗 시스템 구조

```text
사용자

↓

Next.js Frontend

↓

FastAPI Backend

↓

OpenAI API

↓

ChromaDB

↓

JSON Storage
```

---

# 🛠 기술 스택

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

## Backend

* FastAPI
* Python

## AI

* OpenAI API
* ChromaDB
* Vector Search (RAG)

## Data

* JSON Storage
* Local File Storage

## Document Processing

* PyPDF
* Pandas
* OpenPyXL
* ReportLab

---

# 📂 프로젝트 구조

```text
NoteFlowAI/

├── frontend/
│   ├── app/
│   ├── components/
│   ├── public/
│   └── package.json
│
├── app/
│   ├── main.py
│   └── services/
│
├── data/
│   ├── uploads/
│   ├── conversions/
│   ├── results.json
│   └── users.json
│
├── requirements.txt
└── README.md
```

---

# 🔐 인증 구조

```text
회원가입

↓

로그인

↓

JWT 발급

↓

LocalStorage 저장

↓

대시보드 접근

↓

/auth/me 검증

↓

로그아웃
```

---

# 📡 API 목록

## 인증

* POST /auth/register
* POST /auth/login
* GET /auth/me
* POST /auth/logout

## 문서 관리

* POST /upload
* GET /files
* GET /files/{file_id}
* DELETE /files/{file_id}

## 문서 분석

* GET /analysis
* POST /summary
* POST /keywords
* POST /query

## 작업 기록

* GET /results
* GET /results/{file_id}
* DELETE /results/{file_id}

## 파일 변환

* POST /convert
* GET /downloads/{filename}

---

# ⚙ 실행 방법

## Backend

```bash
python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# 📈 현재 구현 완료 기능

* PDF 업로드
* PDF 문서 분석
* AI 자동 요약
* 키워드 추출
* AI 문서 채팅
* 작업 기록
* 문서 삭제
* 파일 변환
* 회원가입
* 로그인
* JWT 인증
* 다크모드
* 모바일 반응형 UI

---

# 🔮 향후 개선 사항

## AI 기능

* OCR 문서 인식
* 문서 번역
* PPT 자동 생성
* 보고서 자동 생성
* AI 문서 비교

## 사용자 기능

* OAuth 로그인

  * Google
  * Kakao
  * Naver

* 마이페이지

* 사용자별 문서 관리

## SaaS 기능

* 구독 플랜
* 사용량 제한
* 관리자 페이지
* 결제 시스템

---

# 👨‍💻 Project

AI Note (NoteFlow AI)

AI 기반 문서 분석 및 문서 업무 자동화를 위한 SaaS 프로젝트
