# AI 기능 명세서 (프로토타입)

## AI 기능 개요

소스코드 분석 기반 PM 업무 자동화를 위한 최소한의 AI 기능 명세

---

## 1. 코드 분석 기반 Task 제안

### 1.1 기능 설명
GitHub 저장소의 커밋 히스토리와 현재 Task 목록을 분석하여 새로운 Task를 제안합니다.

### 1.2 입력
- 프로젝트의 GitHub 커밋 히스토리
- 현재 Task 목록 (제목, 설명, 상태)
- 프로젝트 정보 (제목, 설명)

### 1.3 AI 출력
- 제안되는 새로운 Task 목록
  - 제목
  - 설명
  - 우선순위 (High/Medium/Low)
  - 예상 소요 시간 (선택)

### 1.4 기술 구현
- **LLM**: OpenAI GPT API
- **프롬프트**: 커밋 메시지 및 코드 변경사항을 기반으로 누락된 작업 식별
- **형식**: JSON 응답

### 1.5 API 엔드포인트
- **POST** `/api/ai/task-suggestion`
- **Request Body**:
  ```json
  {
    "projectId": 1,
    "includeCommits": true,
    "includeIssues": true
  }
  ```
- **Response**:
  ```json
  {
    "suggestions": [
      {
        "title": "리팩토링 제안",
        "description": "코드 중복 제거 필요",
        "priority": "Medium",
        "estimatedHours": 4
      }
    ]
  }
  ```

---

## 2. 향후 확장 가능한 기능 (프로토타입 제외)

### 2.1 리팩토링 제안
- 소스코드 분석을 통한 리팩토링 필요 영역 식별
- 취약점 및 코드 품질 이슈 제안

### 2.2 코드 리딩 기반 완료 확인
- Task 요구사항과 실제 코드 변경사항 매칭
- 코드 리뷰를 통한 완료 여부 판단

### 2.3 진행도 예측 분석
- 머신러닝 기반 프로젝트 완료일 예측
- 지연 위험도 분석

---

## 3. 기술 스택

### AI 백엔드
- **프레임워크**: Python, Flask
- **LLM**: OpenAI API
- **GitHub 연동**: PyGithub

### 데이터 처리
- GitHub API를 통해 커밋/이슈 데이터 수집
- LLM 프롬프트 엔지니어링으로 분석 및 제안 생성

---

## 4. API 비용 고려사항

### 프로토타입 단계
- 무료 tier 또는 최소한의 유료 tier 활용
- 요청 수 제한 (하루 10-20회 이내)
- 캐싱 활용으로 중복 요청 방지
