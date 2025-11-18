# AI Agent 구조 발표 자료
## 최신 논문 및 규격 기반 아키텍처 설명

---

## 1. 개요

본 시스템은 **ReAct (Reasoning + Acting)** 패턴을 기반으로 한 **전문 에이전트 라우팅 시스템 (Specialist Agent Routing System)**입니다.

### 핵심 특징
- **의도 기반 라우팅**: 사용자 질의를 분석하여 적절한 전문 에이전트로 자동 라우팅
- **ReAct 패턴 적용**: 각 에이전트 내부에서 Thought-Action-Observation-Reflection 루프 수행
- **다단계 반복 분석**: 정보 충분성 평가를 통한 동적 탐색 (최대 10단계)
- **동적 도구 사용**: GitHub API를 통한 실시간 코드 분석 및 파일 읽기
- **컨텍스트 기반 추론**: 프로젝트 데이터(커밋, 이슈, Task)를 활용한 맥락 이해

### 시스템 구조
- **에이전트 라우팅**: 의도 분류 → 단일 전문 에이전트 선택 → 실행
- **다중 에이전트 아님**: 여러 에이전트가 동시에 협력하지 않음 (한 번에 하나만 실행)

---

## 2. 최신 연구 기반 아키텍처

### 2.1 ReAct (Reasoning + Acting) 패턴 적용

**ReAct 논문** (Yao et al., 2022)에서 제시한 **"Reasoning + Acting"** 패턴을 본 시스템에 적용했습니다.

```
┌─────────────────────────────────────────────────────────┐
│              ReAct 패턴의 핵심 구성 요소                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Thought (사고)                                       │
│     → 현재 상황 분석 및 다음 행동 계획                    │
│                                                          │
│  2. Action (행동)                                        │
│     → 도구 사용 (파일 읽기, 커밋 분석, 디렉토리 탐색)    │
│                                                          │
│  3. Observation (관찰)                                   │
│     → 행동 결과 관찰 및 정보 수집                         │
│                                                          │
│  4. Reflection (반성)                                    │
│     → 정보 충분성 평가 및 다음 단계 결정                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 본 시스템의 ReAct 구현

```python
# multi_step_agent.py의 핵심 루프

while step_number < MAX_ANALYSIS_STEPS:
    # 1. Thought: 프롬프트 생성 (현재 상황 분석)
    prompt = create_prompt(context, current_result, ...)
    
    # 2. Action: LLM 호출 (추론 수행)
    step_result = call_llm_func(prompt, system_prompt)
    
    # 3. Observation: 결과 파싱 및 파일 읽기
    if needs_more_info:
        files = get_file_contents(github_repo, files_to_read)
        context['readFiles'] = files
    
    # 4. Reflection: 정보 충분성 평가
    evaluation = evaluate_information_sufficiency(
        current_result, agent_type, call_llm_func, step_number
    )
    
    # 종료 조건 확인
    if evaluation['is_sufficient']:
        break
```

**참고 논문**: 
- Yao et al. (2022). "ReAct: Synergizing Reasoning and Acting in Language Models"

---

### 2.2 전문 에이전트 라우팅 시스템 (Specialist Agent Routing System)

**LangChain의 Agent Router**와 유사하게, **전문 에이전트**들을 의도에 따라 라우팅하는 시스템을 구현했습니다.

**중요**: 본 시스템은 **다중 에이전트 시스템이 아닙니다**. 여러 에이전트가 동시에 협력하지 않고, **한 번에 하나의 전문 에이전트만 실행**됩니다.

```
┌─────────────────────────────────────────────────────────┐
│        전문 에이전트 라우팅 시스템 구조                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Intent Classifier]                                     │
│       │                                                  │
│       │ 의도 분석: "할 일 추천해줘"                       │
│       │                                                  │
│       ▼                                                  │
│  [Agent Router]                                          │
│       │                                                  │
│       │ 단일 에이전트 선택                                │
│       │                                                  │
│       ▼                                                  │
│  ┌──────────────────────────────────────┐              │
│  │  task_suggestion_agent (Task 제안)    │              │
│  │  └─ ReAct 패턴으로 다단계 분석 수행    │              │
│  └──────────────────────────────────────┘              │
│                                                          │
│  ※ 다른 에이전트들은 실행되지 않음                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**사용 가능한 전문 에이전트들**:
- `task_suggestion_agent`: Task 제안
- `progress_analysis_agent`: 진행도 분석
- `task_completion_agent`: Task 완료 확인
- `task_assignment_agent`: Task 할당 추천
- `general_qa_agent`: 일반 질문 답변

#### 의도 분류 (Intent Classification)

```python
# agent_router.py - classify_intent()

def classify_intent(user_message, conversation_history, call_llm_func):
    """
    사용자 질의의 의도를 분석하여 적절한 agent 타입을 반환
    
    Returns:
        {
            "agent_type": "task_suggestion_agent" | ...,
            "confidence": "high" | "medium" | "low",
            "reason": "...",
            "extracted_info": {...}
        }
    """
```

**참고 프레임워크**:
- LangChain Agents (2023)
- AutoGPT Multi-Agent System (2023)

---

### 2.3 Information Sufficiency Evaluation (정보 충분성 평가)

**AutoGPT**와 유사하게, 각 단계에서 **정보 충분성**을 평가하여 추가 탐색 여부를 결정합니다.

```
┌─────────────────────────────────────────────────────────┐
│        Information Sufficiency Evaluation Loop           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step N: 분석 수행                                       │
│       │                                                  │
│       ▼                                                  │
│  정보 충분성 평가                                         │
│       │                                                  │
│       ├─ is_sufficient: true  → 종료                    │
│       │                                                  │
│       └─ is_sufficient: false → Step N+1 진행           │
│              │                                           │
│              ├─ files_to_read: [...]                    │
│              ├─ commits_to_analyze: [...]              │
│              └─ next_search_strategy: "..."            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 정보 충분성 평가 함수

```python
# multi_step_agent.py - evaluate_information_sufficiency()

def evaluate_information_sufficiency(
    current_result: Dict[str, Any],
    agent_type: str,
    call_llm_func: Callable,
    step_number: int
) -> Dict[str, Any]:
    """
    현재 분석 결과의 정보 충분성을 평가
    
    평가 기준:
    1. 정보 충분성: 질문에 답변하기에 충분한 정보가 있는가?
    2. 신뢰도: 현재 결과의 신뢰도는 어느 정도인가?
    3. 추가 탐색 필요성: 더 많은 정보가 필요한가?
    4. 다음 단계 전략: 추가 탐색이 필요하다면 어떤 파일이나 데이터를 확인해야 하는가?
    
    Returns:
        {
            "is_sufficient": bool,
            "confidence": "high|medium|low",
            "needs_more_info": bool,
            "next_search_strategy": str,
            "files_to_read": List[str],
            "commits_to_analyze": List[str],
            "reason": str
        }
    """
```

**참고 시스템**:
- AutoGPT (2023): Multi-step planning with information gathering
- BabyAGI (2023): Task-driven autonomous agent

---

## 3. 시스템 아키텍처 상세

### 3.1 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    사용자 (프론트엔드)                        │
│              ChatBot.jsx / AIadvisorPage.jsx                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ 1. 사용자 질문 입력
                             │    "할 일 추천해줘"
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js 백엔드 (Express)                        │
│          backend/controllers/aiController.js                 │
│                                                              │
│  컨텍스트 수집:                                              │
│    - 커밋 데이터 (최근 50개)                                 │
│    - 이슈 데이터 (최근 20개)                                 │
│    - Task 데이터 (전체)                                      │
│    - 프로젝트 설명                                            │
│    - 프로젝트 멤버 정보 (태그 포함)                           │
│    - 대화 히스토리                                            │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ 2. AI 백엔드로 전송
                             │    POST /api/ai/chat
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              AI 백엔드 (Flask)                                │
│                  ai-backend/app.py                           │
│                                                              │
│  3. 의도 분류 (Intent Classification)                        │
│     classify_intent()                                       │
│     └─ LLM 호출 → agent_type 결정                            │
│                                                              │
│  4. 에이전트 라우팅 (Agent Routing)                          │
│     route_to_agent()                                        │
│     └─ 선택된 에이전트 실행                                   │
│                                                              │
│  5. 다단계 분석 (Multi-Step Analysis)                        │
│     execute_multi_step_agent()                              │
│     ├─ Step 1: 초기 분석                                     │
│     ├─ Step 2-N: 정보 충분성 평가 후 추가 탐색                │
│     └─ 최대 10단계까지 반복                                   │
│                                                              │
│  6. 동적 도구 사용 (Dynamic Tool Use)                        │
│     ├─ GitHub API: 파일 읽기                                 │
│     ├─ GitHub API: 디렉토리 탐색                             │
│     └─ GitHub API: 커밋 상세 분석                            │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ 7. 결과 반환
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              프론트엔드                                      │
│              결과 표시 및 사용자 인터랙션                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.2 다단계 분석 프로세스 (Multi-Step Analysis)

#### 진행도 분석 에이전트 예시 (5단계)

```
Step 1: 프로젝트 정보 파악
  ├─ README 파일 읽기
  ├─ 프로젝트 구조 분석
  └─ 핵심 기능 식별 (3-6개)

Step 2: 필요한 기능 분석
  ├─ 각 핵심 기능별 세부 기능 도출
  ├─ 예상 구현 위치 추론
  └─ API 라우트 파일 읽기

Step 3: 구현된 기능 확인
  ├─ 소스코드 파일 읽기 (페이지, 컴포넌트, API)
  ├─ 구현 여부 판단
  └─ 핵심 기능별 진행도 계산

Step 4: 미구현 기능 분석
  ├─ 미구현 기능 목록 생성
  └─ 우선순위 평가

Step 5: 평가 및 진행도 계산
  ├─ 전체 진행도 계산 (가중 평균)
  ├─ 테스트/배포 진행도 반영
  └─ 최종 분석 결과 생성
```

#### 정보 충분성 평가 예시

```python
# Step 2 완료 후 평가

evaluation = {
    "is_sufficient": false,
    "confidence": "medium",
    "needs_more_info": true,
    "next_search_strategy": "2단계 결과에서 예상한 파일 경로를 기반으로 실제 소스코드 파일을 읽어야 합니다.",
    "files_to_read": [
        "backend/routes/user.js",
        "backend/controllers/userController.js",
        "morpheus-react/web/src/pages/Login.jsx"
    ],
    "reason": "핵심 기능별 세부 기능은 도출되었으나, 실제 구현 여부를 확인하기 위해 소스코드를 읽어야 합니다."
}

# → Step 3으로 진행하여 파일 읽기 및 분석 수행
```

---

## 4. 최신 연구와의 비교

### 4.1 ReAct vs 본 시스템

| 항목 | ReAct 논문 | 본 시스템 |
|------|-----------|----------|
| **Thought** | LLM이 다음 행동 계획 | 프롬프트 기반 분석 수행 |
| **Action** | 도구 호출 (검색, 계산기 등) | GitHub API 호출 (파일 읽기, 디렉토리 탐색) |
| **Observation** | 도구 결과 관찰 | 파일 내용, 커밋 정보 수집 |
| **Reflection** | 다음 행동 결정 | 정보 충분성 평가 및 추가 탐색 결정 |

**차이점**:
- ReAct: 일반적인 도구 사용 (검색, 계산기 등)
- 본 시스템: **프로젝트 관리 특화 도구** (GitHub API, 코드 분석)

---

### 4.2 LangChain Agent Router vs 본 시스템

| 항목 | LangChain Agent Router | 본 시스템 |
|------|----------------------|----------|
| **의도 분류** | 사용자 정의 | LLM 기반 자동 분류 |
| **에이전트 선택** | 명시적 에이전트 지정 | 자동 라우팅 |
| **에이전트 실행** | 단일 에이전트 실행 | 단일 에이전트 실행 |
| **다중 에이전트** | ❌ (라우팅만) | ❌ (라우팅만) |
| **도구 사용** | @tool 데코레이터 | 동적 GitHub API 호출 |
| **메모리** | ConversationBufferMemory | 대화 히스토리 + 프로젝트 컨텍스트 |
| **ReAct 패턴** | 지원 (선택적) | 모든 에이전트에 적용 |

**장점**:
- **프로젝트 컨텍스트 통합**: 커밋, 이슈, Task 데이터를 자동으로 활용
- **동적 파일 탐색**: LLM이 필요한 파일을 결정하고 읽기
- **ReAct 패턴 통합**: 모든 에이전트가 ReAct 패턴으로 동작

---

### 4.3 AutoGPT vs 본 시스템

| 항목 | AutoGPT | 본 시스템 |
|------|---------|----------|
| **목표 설정** | 사용자가 명시적 목표 제공 | 사용자 질의에서 목표 추론 |
| **다단계 계획** | 자동 목표 분해 | 정보 충분성 기반 반복 분석 |
| **도구 사용** | 웹 검색, 파일 시스템 | GitHub API (코드 분석 특화) |
| **종료 조건** | 목표 달성 또는 실패 | 정보 충분성 평가 |

**차이점**:
- AutoGPT: **일반적인 자율 에이전트** (웹 검색, 파일 작성 등)
- 본 시스템: **프로젝트 관리 특화 에이전트** (코드 분석, Task 관리)

---

## 5. 핵심 기술 요소

### 5.1 동적 파일 탐색 (Dynamic File Discovery)

**LLM이 필요한 파일을 결정하고 읽는** 방식으로, 하드코딩된 파일 목록 대신 **지능형 탐색**을 수행합니다.

```python
# multi_step_agent.py - 동적 파일 탐색 예시

# Step 2 결과에서 예상 구현 위치 추론
required_features = step2_result.get('requiredFeatures', [])

for feat in required_features:
    expected_loc = feat.get('expectedLocation', '')
    feat_type = feat.get('type', '')
    
    # API의 경우 라우트 파일 경로 추론
    if feat_type == 'api':
        # API 이름에서 리소스 추출
        # 예: "사용자 인증 API" → "user"
        resource = extract_resource_from_api_name(feat_name)
        
        # 백엔드 라우트 파일 경로 추론
        backend_route = f"backend/routes/{resource}.js"
        controller = f"backend/controllers/{resource}Controller.js"
        
        # 파일 읽기
        files_to_read.append(backend_route)
        files_to_read.append(controller)
```

**장점**:
- 프로젝트 구조에 독립적
- 필요한 파일만 선택적으로 읽기 (효율성)
- LLM의 추론 능력 활용

---

### 5.2 정보 충분성 평가 (Information Sufficiency Evaluation)

각 단계에서 **LLM이 스스로 정보 충분성을 평가**하여 추가 탐색 여부를 결정합니다.

```python
# multi_step_agent.py - 정보 충분성 평가

evaluation_prompt = f"""
당신은 정보 분석 전문가입니다. 현재 분석 결과를 평가하여 충분한 정보가 수집되었는지 판단하세요.

## 평가 기준:
1. **정보 충분성**: 질문에 답변하기에 충분한 정보가 있는가?
2. **신뢰도**: 현재 결과의 신뢰도는 어느 정도인가?
3. **추가 탐색 필요성**: 더 많은 정보가 필요한가?
4. **다음 단계 전략**: 추가 탐색이 필요하다면 어떤 파일이나 데이터를 확인해야 하는가?

## 응답 형식:
{{
  "is_sufficient": true 또는 false,
  "confidence": "high|medium|low",
  "needs_more_info": true 또는 false,
  "next_search_strategy": "추가 탐색 전략 설명",
  "files_to_read": ["파일경로1", "파일경로2"],
  "reason": "평가 이유를 한국어로 설명"
}}
"""
```

**장점**:
- 불필요한 탐색 방지 (효율성)
- 신뢰도 기반 종료 조건
- 동적 탐색 전략 수립

---

### 5.3 병렬 파일 읽기 (Parallel File Reading)

**ThreadPoolExecutor**를 사용하여 여러 파일을 병렬로 읽어 성능을 향상시킵니다.

```python
# multi_step_agent.py - 병렬 파일 읽기

def get_file_contents(
    github_repo: str,
    github_token: Optional[str],
    file_paths: List[str],
    ref: str = 'main',
    max_lines_per_file: int = 500
) -> List[Dict[str, Any]]:
    """
    GitHub에서 파일 내용을 가져옴 (병렬 처리)
    """
    # 병렬 처리 (최대 10개 동시 요청)
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_file = {
            executor.submit(fetch_single_file, file_path): file_path 
            for file_path in files_to_fetch
        }
        for future in as_completed(future_to_file):
            result = future.result()
            results.append(result)
    
    return results
```

**성능 향상**:
- 순차 처리: 10개 파일 × 1초 = 10초
- 병렬 처리: 10개 파일 ÷ 10 workers = 약 1초

---

## 6. 에이전트별 상세 설명

### 6.1 Task 제안 에이전트 (5단계 프로세스)

**특징**: GitHub 소스코드를 직접 읽어 분석하는 **코드 기반 Task 제안**

```
Step 1: 프로젝트 정보 파악
  └─ README, package.json 등 설정 파일 읽기

Step 2: 현재 Task 및 소스코드 구현 파악
  ├─ 디렉토리 탐색 (src/, app/, components/ 등)
  ├─ LLM이 필요한 파일 선택
  └─ 선택된 파일 읽기 (최대 15개)

Step 3: 부족한 Task 제안
  └─ 기능 격차 분석 및 Task 제안

Step 4: 보안 및 리팩토링 개선점 제안 (GitHub 연결 시)
  └─ 코드 품질 분석

Step 5: Task 형식으로 통합 및 출력
  └─ 카테고리별 정렬 (security > refactor > feature > ...)
```

**차별점**: 
- 일반적인 Task 제안: 커밋 메시지/이슈 기반
- 본 시스템: **실제 소스코드 분석 기반** (더 정확한 제안)

---

### 6.2 진행도 분석 에이전트 (다단계 분석)

**특징**: 소스코드를 직접 읽어 **구현된 기능을 정확히 파악**

```
Step 1: 프로젝트 정보 파악
  └─ 핵심 기능 식별 (3-6개)

Step 2: 필요한 기능 분석
  └─ 각 핵심 기능별 세부 기능 도출

Step 3: 구현된 기능 확인
  ├─ 소스코드 파일 읽기 (페이지, 컴포넌트, API)
  ├─ 구현 여부 판단
  └─ 핵심 기능별 진행도 계산

Step 4: 미구현 기능 분석
  └─ 미구현 기능 목록 생성

Step 5: 평가 및 진행도 계산
  ├─ 전체 진행도 계산 (가중 평균)
  └─ 테스트/배포 진행도 반영
```

**차별점**:
- 일반적인 진행도 분석: Task 완료율 기반
- 본 시스템: **실제 코드 구현 여부 기반** (더 정확한 진행도)

---

### 6.3 Task 완료 확인 에이전트 (다단계 분석)

**특징**: 커밋 메시지뿐만 아니라 **실제 코드 변경사항(diff)을 분석**

```
Step 1: Task 요구사항 분석 및 예상 구현 위치 파악
  └─ Task 제목/설명에서 예상 구현 위치 추론

Step 2: 관련 커밋의 코드 변경사항 상세 분석
  ├─ 커밋 메시지 분석
  ├─ 파일 변경사항 분석 (diff)
  └─ 코드 변경사항이 Task 요구사항을 구현하는지 확인

Step 3: Task 완료 여부 및 완성도 판단
  ├─ 완전히 구현되었는가? → 완료 (100%)
  ├─ 부분적으로 구현되었는가? → 진행 중 (50-90%)
  └─ 구현되지 않았는가? → 미구현 (0-40%)
```

**차별점**:
- 일반적인 Task 완료 확인: 커밋 메시지만 분석
- 본 시스템: **실제 코드 변경사항(diff) 분석** (더 정확한 판단)

---

## 7. 성능 최적화

### 7.1 병렬 처리

- **파일 읽기**: ThreadPoolExecutor로 최대 10개 동시 요청
- **디렉토리 탐색**: 최대 3개 디렉토리 병렬 탐색

### 7.2 선택적 파일 읽기

- **LLM 기반 파일 선택**: 필요한 파일만 선택적으로 읽기
- **최대 파일 수 제한**: 50개 파일로 제한 (메모리 효율성)

### 7.3 라인 수 제한

- **파일당 최대 500줄**: 큰 파일은 앞부분만 읽기
- **커밋당 최대 15개 파일**: 관련 파일만 분석

---

## 8. 향후 개선 방향

### 8.1 스트리밍 응답

- LLM 응답을 스트리밍하여 사용자 경험 개선
- 진행 상황 실시간 표시

### 8.2 캐싱

- 동일 프로젝트의 반복 요청 캐싱
- 파일 내용 캐싱 (GitHub API 호출 감소)

### 8.3 에이전트 확장

- 코드 리뷰 에이전트
- 버그 탐지 에이전트
- 성능 분석 에이전트

---

## 9. 결론

### 핵심 차별점

1. **ReAct 패턴 적용**: Reasoning + Acting을 프로젝트 관리에 특화
2. **전문 에이전트 라우팅**: 의도 기반 자동 에이전트 선택 및 실행
3. **동적 파일 탐색**: LLM이 필요한 파일을 결정하고 읽기
4. **정보 충분성 평가**: 각 단계에서 자동으로 추가 탐색 여부 결정
5. **실제 코드 분석**: 커밋 메시지뿐만 아니라 실제 코드 변경사항 분석

### 시스템 아키텍처 요약

```
[사용자 질의]
    │
    ▼
[의도 분류 (Intent Classification)]
    │
    ▼
[에이전트 라우팅 (Agent Routing)]
    │
    ├─→ task_suggestion_agent
    ├─→ progress_analysis_agent
    ├─→ task_completion_agent
    ├─→ task_assignment_agent
    └─→ general_qa_agent
    
    (한 번에 하나만 선택되어 실행)
    │
    ▼
[ReAct 패턴 실행]
    ├─ Thought: 현재 상황 분석
    ├─ Action: 도구 사용 (파일 읽기, 커밋 분석)
    ├─ Observation: 결과 관찰
    └─ Reflection: 정보 충분성 평가
    
    (필요시 반복, 최대 10단계)
    │
    ▼
[결과 반환]
```

### 최신 연구와의 연관성

- **ReAct (2022)**: Thought-Action-Observation-Reflection 패턴
- **LangChain Agent Router (2023)**: 전문 에이전트 라우팅 시스템
- **AutoGPT (2023)**: Multi-step planning with information gathering

### 정확한 시스템 분류

- **❌ 다중 에이전트 시스템 (Multi-Agent System) 아님**
  - 여러 에이전트가 동시에 협력하지 않음
  - 에이전트 간 통신/협력이 없음
  
- **✅ 전문 에이전트 라우팅 시스템 (Specialist Agent Routing System)**
  - 의도 분류 → 단일 전문 에이전트 선택 → 실행
  - 각 에이전트는 독립적으로 ReAct 패턴으로 동작
  
- **✅ ReAct 기반 에이전트 시스템**
  - 각 에이전트 내부에서 Thought-Action-Observation-Reflection 루프 수행

### 실용성

- **프로젝트 관리 특화**: 일반적인 에이전트가 아닌 프로젝트 관리에 최적화
- **실제 코드 분석**: 추상적인 분석이 아닌 실제 소스코드 기반 분석
- **효율적인 탐색**: 필요한 정보만 선택적으로 수집

---

## 참고 자료

### 논문
1. Yao et al. (2022). "ReAct: Synergizing Reasoning and Acting in Language Models"
2. Wang et al. (2023). "Self-Consistency Improves Chain of Thought Reasoning in Language Models"

### 프레임워크
1. LangChain Agents (2023)
2. AutoGPT (2023)
3. BabyAGI (2023)

### 관련 기술
1. OpenAI Function Calling
2. ReAct-style Agents
3. Multi-Agent Systems

---

## 부록: 코드 구조

### 주요 파일

```
ai-backend/
├── agent_router.py          # 의도 분류 및 에이전트 라우팅
├── multi_step_agent.py      # 다단계 분석 엔진
├── prompt_functions.py      # 에이전트별 프롬프트 생성
└── app.py                    # Flask API 서버

backend/
└── controllers/
    └── aiController.js       # Node.js 백엔드 컨트롤러
```

### 핵심 함수

```python
# agent_router.py
classify_intent()              # 의도 분류
route_to_agent()              # 에이전트 라우팅

# multi_step_agent.py
execute_multi_step_agent()    # 다단계 분석 실행
evaluate_information_sufficiency()  # 정보 충분성 평가
get_file_contents()           # 파일 읽기 (병렬 처리)
list_directory_contents()     # 디렉토리 탐색
```

---

**작성일**: 2024년
**버전**: 1.0

