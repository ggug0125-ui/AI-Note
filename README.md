# 📄 AI Note (NoteFlow AI)

> **AI-powered Document Assistant + AI Tarot + Credit & Payment Platform**

AI Note(NoteFlow AI)는 **AI 문서 분석**, **RAG 기반 문서 질의응답**, **AI 타로 서비스**, **크레딧 기반 결제 시스템**을 하나의 플랫폼으로 통합한 AI SaaS 프로젝트입니다.

사용자는 PDF 문서를 업로드하여 AI와 대화할 수 있으며, AI 타로를 통해 OpenAI 기반 운세 리딩을 받을 수 있습니다. 또한 크레딧 시스템과 결제 아키텍처를 통해 실제 SaaS 서비스 운영을 목표로 개발되었습니다.

---

# ✨ 주요 기능

## 👤 사용자 인증

* 회원가입
* 로그인
* JWT 인증
* 로그인 유지
* 로그아웃
* 보호된 페이지 접근
* 관리자(Admin) 권한 관리

---

## 📄 AI 문서 어시스턴트

* PDF 업로드
* 문서 분석
* 문서 기반 질의응답(RAG)
* OpenAI 응답 생성
* 출처(Source) 표시
* 문서 삭제
* 사용자별 문서 관리

---

## 📝 AI 자동 요약

지원 기능

* 핵심 요약
* 회의록 요약
* 보고서 요약
* 액션 아이템 요약

---

## 🔑 AI 키워드 추출

* 핵심 키워드
* 토픽 추출
* 키워드 개수 조절
* 분석 범위 설정

---

## 💬 AI 문서 채팅 (RAG)

* ChromaDB 벡터 검색
* OpenAI 기반 답변
* 문서 내용 기반 질문
* 사용자별 대화 기록 저장

---

## 🔄 문서 변환

지원

* Excel → CSV
* Excel → PDF
* HWPX → TXT

예정

* HWP → TXT
* PDF → Word

---

# 🃏 AI Tarot (Wicked Edition)

AI Note만의 감성 AI 타로 서비스입니다.

## 세계 선택

### 🧙 Chichi

* Wicked Witch World
* 초록 마녀 컨셉
* T형(MBTI) 스타일

### 🧚 Lilla

* Fairy World
* 핑크 요정 컨셉
* F형(MBTI) 스타일

---

## 타로 기능

* 메이저 아르카나 22장
* 카드 셔플
* 3장 선택 (과거 / 현재 / 미래)
* OpenAI 기반 타로 해석
* 사용자 질문 기반 리딩
* 결과 저장
* 다시보기
* 삭제
* MongoDB 저장

### 지원 카테고리

* 오늘의 운세
* 연애운
* 재물운
* 취업·진로
* 학업운
* 자유 질문

---

# 💎 Credit System

AI Note는 크레딧 기반 서비스를 제공합니다.

## 문서 AI

* 1~2페이지 : 1 Credit
* 3페이지 이상 : 0.5 Credit / Page

## AI Tarot

오늘의 운세

* 하루 1회 무료
* 이후 1 Credit

기타 리딩

* 3 Credits

---

## Credit 기능

* Credit 잔액
* Credit 사용 내역
* Credit 충전 내역
* 관리자 지급
* 사용자별 Credit 관리

---

# 💳 Payment System

확장 가능한 Payment Provider 구조를 적용했습니다.

## Provider

* MockProvider
* StripeProvider
* (예정) TossProvider

## Payment 기능

* PaymentService
* Payment History
* Credit Deposit
* Credit Transaction
* Stripe Checkout
* Stripe Webhook
* 중복 지급 방지
* 관리자 테스트 모드

---

# 👤 My Page

* AI 문서 기록
* AI Tarot 기록
* 결제 정보
* 결제 내역
* 사용자 정보
* 관리자 기능

---

# 📊 관리자 기능

* 관리자 전용 AI 기능
* 사용자 관리
* Credit 지급
* Payment 테스트
* 서비스 통계

---

# 🏗 시스템 아키텍처

```text
                    AI Note

                       │

            Next.js + React + Tailwind

                       │

                 FastAPI Backend

                       │

     ┌────────────┬─────────────┬────────────┐

   OpenAI      MongoDB       Payment

      │            │              │

   ChromaDB    History      Mock / Stripe

      │            │              │

   AI Engine   Credit DB    PaymentService
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
* LangChain
* ChromaDB (RAG)

## Database

* MongoDB Atlas
* JSON Backup

## Authentication

* JWT

## Payment

* PaymentProvider
* Mock Payment
* Stripe Checkout
* Stripe Webhook

---

# 📂 프로젝트 구조

```text
NoteFlowAI/

├── frontend/
│
├── app/
│   ├── services/
│   │   ├── payment_provider.py
│   │   ├── mock_payment_provider.py
│   │   ├── stripe_payment_provider.py
│   │   ├── payment_service.py
│   │   ├── payment_store.py
│   │   ├── credit_store.py
│   │   └── ...
│   │
│   └── main.py
│
├── data/
├── requirements.txt
└── README.md
```

---

# 📡 주요 API

## Authentication

* POST /auth/register
* POST /auth/login
* GET /auth/me

## Document

* POST /upload
* GET /files
* DELETE /files/{id}

## AI

* POST /summary
* POST /keywords
* POST /query

## Tarot

* POST /tarot/reading
* GET /tarot/readings
* DELETE /tarot/readings/{id}

## Credits

* GET /credits/me
* GET /credits/transactions

## Payment

* GET /payments/products
* POST /payments/checkout
* POST /payments/mock/success
* POST /payments/webhook/stripe
* GET /payments/history

---

# 🚀 현재 구현 완료

* JWT 로그인 시스템
* MongoDB 사용자 관리
* AI 문서 분석
* RAG 문서 채팅
* AI 자동 요약
* AI 키워드 추출
* 문서 변환
* AI Tarot
* Credit System
* Payment Architecture
* Mock Payment
* Stripe Provider
* Stripe Webhook
* Payment History
* Credit History
* 관리자 시스템
* 반응형 UI
* 다크모드

---

# 🔮 Roadmap

### AI

* OCR 문서 인식
* AI 보고서 생성
* PPT 자동 생성
* 문서 비교

### Payment

* Stripe Live
* Toss Payments
* Subscription

### User

* Google Login
* Kakao Login
* Naver Login

### Platform

* Prompt Library
* AI Workflow
* Team Workspace

---

# 👨‍💻 Project

**AI Note (NoteFlow AI)**

> **AI Document Assistant + AI Tarot + Credit Platform + Payment System**

AI 기반 문서 업무 자동화와 AI 타로 서비스를 통합한 차세대 AI SaaS 프로젝트입니다.

