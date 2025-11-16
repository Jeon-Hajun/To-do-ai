# AI 에이전트 작동 원리 도식화

## 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 (프론트엔드)                        │
│                    ChatBot.jsx / AIadvisorPage.jsx               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ 1. 사용자 질문 입력
                             │    "할 일 추천해줘"
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js 백엔드 (Express)                      │
│                    backend/controllers/aiController.js          │
│                                                                 │
│  2. 프로젝트 컨텍스트 수집:                                      │
│     - 커밋 데이터 (최근 50개)                                    │
│     - 이슈 데이터 (최근 20개)                                     │
│     - Task 데이터 (전체)                                         │
│     - 프로젝트 설명                                              │
│     - 프로젝트 멤버 정보 (태그 포함)                              │
│     - 대화 히스토리                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ 3. AI 백엔드로 전송
                             │    POST /api/ai/chat
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI 백엔드 (Flask)                             │
│                    ai-backend/app.py                             │
│                                                                 │
│  4. 요청 수신 및 전처리                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ 5. 의도 분류 (Intent Classification)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              agent_router.py - classify_intent()                │
│                                                                 │
│  입력:                                                           │
│    - 사용자 메시지                                               │
│    - 대화 히스토리                                               │
│    - 프로젝트 컨텍스트                                           │
│                                                                 │
│  처리:                                                           │
│    - LLM 호출 (의도 분석 프롬프트)                                │
│    - JSON 파싱                                                   │
│                                                                 │
│  출력:                                                           │
│    {                                                             │
│      "agent_type": "task_suggestion_agent" |                    │
│                   "progress_analysis_agent" |                   │
│                   "task_completion_agent" |                      │
│                   "task_assignment_agent" |                     │
│                   "general_qa_agent",                            │
│      "confidence": "high" | "medium" | "low",                   │
│      "reason": "...",                                            │
│      "extracted_info": {...}                                    │
│    }                                                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ 6. 에이전트 라우팅
                             ▼
        ┌────────────────────┴────────────────────┐
        │                                          │
        ▼                                          ▼
┌───────────────────┐                    ┌───────────────────┐
│  단일 단계 에이전트  │                    │  다단계 에이전트    │
│                   │                    │                   │
│ - Task 제안        │                    │ - Task 완료 확인  │
│ - 진행도 분석      │                    │   (2단계 분석)     │
│ - 일반 QA          │                    │                   │
│ - Task 할당 추천   │                    │                   │
└───────────────────┘                    └───────────────────┘
```

## 상세 작동 흐름

### 1. 단일 단계 에이전트 (Task 제안, 진행도 분석, 일반 QA, Task 할당 추천)

```
사용자 질문
    │
    ▼
[의도 분류]
    │
    ▼
[에이전트 선택]
    │
    ▼
[프롬프트 생성]
    │
    ├─ 프로젝트 컨텍스트 포함
    ├─ 커밋, 이슈, Task 데이터
    └─ 특화된 프롬프트 템플릿
    │
    ▼
[LLM 호출]
    │
    ├─ Ollama (로컬) 또는
    └─ OpenAI (클라우드)
    │
    ▼
[응답 파싱]
    │
    ├─ JSON 추출
    ├─ 마크다운 코드 블록 제거
    └─ JSON 파싱
    │
    ▼
[결과 반환]
    │
    └─ 프론트엔드로 전송
```

### 2. 다단계 에이전트 (Task 완료 확인)

```
사용자 질문: "이 작업 완료됐어?"
    │
    ▼
[의도 분류] → task_completion_agent 선택
    │
    ▼
[1차 분석 - 초기 평가]
    │
    ├─ 프롬프트: create_initial_completion_prompt()
    ├─ 입력: Task 정보, 커밋 데이터, 프로젝트 설명
    └─ LLM 호출
    │
    ▼
[1차 결과 분석]
    │
    ├─ needsMoreInfo: false → [최종 결과 반환]
    └─ needsMoreInfo: true  → [2차 분석 진행]
    │
    ▼
[2차 분석 - 추가 탐색]
    │
    ├─ 프롬프트: create_followup_completion_prompt()
    ├─ 입력: 1차 결과 + 추가 컨텍스트
    └─ LLM 호출
    │
    ▼
[2차 결과 분석]
    │
    ├─ 1차 결과와 통합
    └─ analysisSteps: 2
    │
    ▼
[최종 결과 반환]
    │
    └─ 프론트엔드로 전송
```

## 각 에이전트별 상세 흐름

### Task 제안 에이전트 (task_suggestion_agent)

```
입력:
  - 커밋 데이터 (최근 50개)
  - 이슈 데이터 (최근 20개)
  - 현재 Task 목록
  - 프로젝트 설명
  - GitHub 저장소 정보

프롬프트 생성:
  - create_optimized_task_suggestion_prompt()
  - 커밋 패턴 분석
  - 이슈 내용 분석
  - 기존 Task와의 중복 방지

LLM 호출:
  - 시스템 프롬프트: "소프트웨어 엔지니어링 전문가"
  - JSON 형식 응답 요청

응답 처리:
  - JSON 파싱
  - 카테고리별 정렬 (security > refactor > feature > performance > maintenance)
  - 우선순위별 정렬 (High > Medium > Low)

출력:
  {
    "type": "task_suggestions",
    "suggestions": [
      {
        "title": "...",
        "description": "...",
        "category": "security|refactor|feature|...",
        "priority": "High|Medium|Low",
        "reason": "..."
      }
    ],
    "message": "N개의 Task를 제안했습니다."
  }
```

### 진행도 분석 에이전트 (progress_analysis_agent)

```
입력:
  - 커밋 데이터
  - Task 데이터 (상태별)
  - 프로젝트 설명
  - 프로젝트 시작일/마감일

프롬프트 생성:
  - create_optimized_progress_prompt()
  - 커밋 활동 분석
  - Task 완료율 계산
  - 시간 기반 예측

LLM 호출:
  - 시스템 프롬프트: "프로젝트 관리 전문가"
  - JSON 형식 응답 요청

응답 처리:
  - JSON 파싱
  - 진행도 퍼센트 추출
  - 활동 추세 분석 (증가/안정/감소)

출력:
  {
    "type": "progress_analysis",
    "analysis": {
      "currentProgress": 65,
      "activityTrend": "increasing|stable|decreasing",
      "predictedCompletion": "...",
      ...
    },
    "message": "현재 진행도는 65%이며, 활동 추세는 증가 중입니다."
  }
```

### Task 완료 확인 에이전트 (task_completion_agent)

```
입력:
  - Task 정보 (제목, 설명, 상태)
  - 커밋 데이터 (전체)
  - 프로젝트 설명

[1차 분석]
프롬프트: create_initial_completion_prompt()
  - Task 제목/설명 분석
  - 커밋 메시지와의 관련성 판단
  - 파일 변경사항 분석
  - 초기 완료 여부 평가

결과:
  {
    "isCompleted": false,
    "completionPercentage": 70,
    "needsMoreInfo": true,
    "searchStrategy": "파일 경로 기반 검색",
    "expectedLocation": "src/auth/login.js",
    "currentAnalysis": "..."
  }

[2차 분석] (needsMoreInfo가 true인 경우)
프롬프트: create_followup_completion_prompt()
  - 1차 결과 기반 추가 탐색
  - 특정 파일/디렉토리 집중 분석
  - 더 깊은 코드 분석

최종 결과:
  {
    "isCompleted": true,
    "completionPercentage": 95,
    "confidence": "high",
    "reason": "...",
    "analysisSteps": 2,
    "initialAnalysis": {...}
  }
```

### 일반 QA 에이전트 (general_qa_agent)

```
입력:
  - 사용자 질문
  - 프로젝트 통계 (Task, 커밋, 이슈)
  - 프로젝트 설명
  - 최근 활동 데이터

프롬프트 생성:
  - 프로젝트 통계 포함
  - 최근 커밋/Task 목록
  - 답변 가능 여부 판단 로직

LLM 호출:
  - 시스템 프롬프트: "프로젝트 관리 전문가"
  - JSON 형식 응답 요청

응답 처리:
  - can_answer 플래그 확인
  - 답변 가능: 프로젝트 정보 기반 답변
  - 답변 불가: 정중한 거부 메시지

출력:
  {
    "type": "general_qa",
    "message": "커밋은 총 45개입니다.",
    "details": {
      "used_statistics": ["커밋 통계"],
      "source": "프로젝트 통계"
    }
  }
```

### Task 할당 추천 에이전트 (task_assignment_agent)

```
입력:
  - Task 정보 (제목, 설명)
  - 프로젝트 멤버 정보 (태그 포함)
  - 사용자 메시지

프롬프트 생성:
  - create_task_assignment_prompt()
  - Task 내용 분석
  - 멤버 태그(직무) 매칭
  - 추천 이유 생성

LLM 호출:
  - 시스템 프롬프트: "프로젝트 관리 전문가"
  - JSON 형식 응답 요청

응답 처리:
  - JSON 파싱
  - 추천된 사용자 ID 추출
  - 추천 이유 및 신뢰도 포함

출력:
  {
    "type": "task_assignment",
    "recommendedUserId": 123,
    "reason": "프론트엔드 개발 경험이 풍부하여...",
    "confidence": "high|medium|low",
    "message": "'로그인 기능' Task는 홍길동님에게 할당하는 것을 추천합니다."
  }
```

## 데이터 흐름 다이어그램

```
┌──────────────┐
│   사용자      │
└──────┬───────┘
       │ 질문: "할 일 추천해줘"
       ▼
┌─────────────────────────────────────┐
│  Node.js 백엔드 (aiController.js)   │
│                                      │
│  1. 프로젝트 컨텍스트 수집:           │
│     ├─ DB 쿼리: 커밋, 이슈, Task      │
│     ├─ GitHub API: 추가 데이터        │
│     └─ 프로젝트 멤버 정보             │
│                                      │
│  2. 컨텍스트 객체 생성:               │
│     {                                 │
│       commits: [...],                │
│       issues: [...],                 │
│       tasks: [...],                  │
│       projectDescription: "...",     │
│       projectMembersWithTags: [...]  │
│     }                                 │
└──────┬───────────────────────────────┘
       │ POST /api/ai/chat
       │ { projectId, message, conversationHistory }
       ▼
┌─────────────────────────────────────┐
│  AI 백엔드 (app.py)                  │
│                                      │
│  3. 의도 분류:                       │
│     classify_intent()                │
│     └─ LLM 호출 → agent_type 결정     │
│                                      │
│  4. 에이전트 라우팅:                  │
│     route_to_agent()                 │
│     └─ 선택된 에이전트 실행           │
│                                      │
│  5. 프롬프트 생성:                    │
│     prompt_optimizer.py              │
│     └─ 컨텍스트 기반 프롬프트 생성     │
│                                      │
│  6. LLM 호출:                        │
│     ├─ Ollama (로컬)                 │
│     └─ OpenAI (클라우드)             │
│                                      │
│  7. 응답 파싱:                       │
│     ├─ JSON 추출                     │
│     ├─ 마크다운 제거                  │
│     └─ 구조화된 데이터 생성           │
└──────┬───────────────────────────────┘
       │ { success: true, data: {...} }
       ▼
┌─────────────────────────────────────┐
│  Node.js 백엔드                      │
│                                      │
│  8. 응답 처리:                       │
│     ├─ 대화 히스토리 저장             │
│     └─ 프론트엔드로 전송              │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  프론트엔드 (ChatBot.jsx)            │
│                                      │
│  9. UI 업데이트:                     │
│     ├─ 메시지 표시                   │
│     ├─ Task 제안 모달 (필요시)        │
│     └─ 사용자 인터랙션                │
└─────────────────────────────────────┘
```

## 핵심 특징

### 1. 컨텍스트 기반 의사결정
- 프로젝트의 실제 데이터(커밋, 이슈, Task)를 활용
- 대화 히스토리를 통한 맥락 유지
- 프로젝트별 독립적인 대화 관리

### 2. 지능형 에이전트 라우팅
- 사용자 질문의 의도를 자동 분석
- 적절한 전문 에이전트로 자동 라우팅
- 신뢰도 기반 처리

### 3. 다단계 분석 (Task 완료 확인)
- 1차 분석: 초기 평가 및 추가 탐색 필요성 판단
- 2차 분석: 필요시 더 깊은 분석 수행
- 단계별 결과 통합

### 4. 강화된 JSON 파싱
- 마크다운 코드 블록 제거
- 불필요한 텍스트 제거
- 정규식 기반 재시도 로직

### 5. 프롬프트 최적화
- 불필요한 정보 제거
- 핵심 정보만 포함
- 에이전트별 특화된 프롬프트

## 에러 처리

```
LLM 호출 실패
    │
    ├─ 재시도 로직
    ├─ 기본값 반환
    └─ 에러 메시지 생성

JSON 파싱 실패
    │
    ├─ 마크다운 제거 재시도
    ├─ 정규식 기반 추출
    └─ 기본 구조 반환

에이전트 실행 실패
    │
    ├─ 에러 정보 포함
    ├─ 사용자 친화적 메시지
    └─ 대체 에이전트 제안
```

