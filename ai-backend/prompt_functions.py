"""
다단계 분석을 위한 프롬프트 생성 함수들
각 에이전트별로 초기 및 후속 프롬프트를 생성하는 함수
"""

import json
from prompt_optimizer import (
    create_optimized_task_suggestion_prompt,
    create_optimized_progress_prompt,
    create_initial_completion_prompt,
    create_followup_completion_prompt,
    create_task_assignment_prompt
)

def create_task_suggestion_initial_prompt(context, user_message, read_files, analyzed_commits):
    """Task 제안 에이전트 초기 프롬프트"""
    commits = context.get('commits', [])
    issues = context.get('issues', [])
    currentTasks = context.get('currentTasks', [])
    projectDescription = context.get('projectDescription', '')
    githubRepo = context.get('githubRepo', '')
    
    # 읽은 파일 정보 추가
    files_context = ""
    if read_files:
        files_context = "\n\n## 읽은 파일 내용:\n"
        for file_info in read_files[:5]:
            content = file_info.get('content', '')[:500]  # 최대 500자
            files_context += f"파일: {file_info.get('path', '')}\n{content}\n---\n"
    
    base_prompt = create_optimized_task_suggestion_prompt(
        commits, issues, currentTasks, projectDescription, githubRepo
    )
    
    return base_prompt + files_context + "\n\n위 정보를 바탕으로 Task를 제안하세요. JSON 배열 형식으로 응답하세요."

def create_task_suggestion_followup_prompt(context, previous_result, user_message, read_files, analyzed_commits):
    """Task 제안 에이전트 후속 프롬프트"""
    commits = context.get('commits', [])
    issues = context.get('issues', [])
    currentTasks = context.get('currentTasks', [])
    projectDescription = context.get('projectDescription', '')
    githubRepo = context.get('githubRepo', '')
    
    # 읽은 파일 정보 추가
    files_context = ""
    if read_files:
        files_context = "\n\n## 새로 읽은 파일 내용:\n"
        for file_info in read_files[-5:]:  # 최근 5개만
            content = file_info.get('content', '')[:500]
            files_context += f"파일: {file_info.get('path', '')}\n{content}\n---\n"
    
    prompt = f"""이전 분석 결과를 바탕으로 더 깊이 분석하세요.

## 이전 분석 결과:
{json.dumps(previous_result, ensure_ascii=False, indent=2)[:1000]}

## 프로젝트 컨텍스트:
- 커밋: {len(commits)}개
- 이슈: {len(issues)}개
- 현재 Task: {len(currentTasks)}개
- 프로젝트 설명: {projectDescription[:200]}

{files_context}

## 추가 분석 요청:
위 파일 내용을 참고하여 더 정확하고 구체적인 Task를 제안하세요. 
특히 코드 구조, 패턴, 잠재적 문제점을 분석하여 Task를 제안하세요.

다음 JSON 배열 형식으로만 응답하세요:
[{{"title": "...", "description": "...", "category": "feature|refactor|security|performance|maintenance", "priority": "High|Medium|Low", "estimatedHours": 숫자, "reason": "..."}}]
"""
    return prompt

def create_progress_analysis_initial_prompt(context, user_message, read_files, analyzed_commits, step_number=1):
    """진행도 분석 에이전트 초기 프롬프트 (1단계: 프로젝트 분석)"""
    commits = context.get('commits', [])
    tasks = context.get('tasks', [])
    projectDescription = context.get('projectDescription', '')
    projectStartDate = context.get('projectStartDate', None)
    projectDueDate = context.get('projectDueDate', None)
    
    # 읽은 파일 내용 추가
    files_section = ""
    if read_files:
        files_section = "\n\n## 📄 읽은 파일 내용:\n\n"
        for file_info in read_files:
            file_path = file_info.get('path', '')
            file_content = file_info.get('content', '')
            if file_content:
                content_preview = file_content[:3000] if len(file_content) > 3000 else file_content
                files_section += f"### 파일: {file_path}\n```\n{content_preview}\n```\n\n"
    
    # 사용자 요청 분석 (특정 영역에 집중하라는 요청이 있는지 확인)
    user_focus = ""
    if user_message:
        user_msg_lower = user_message.lower()
        if any(keyword in user_msg_lower for keyword in ['프론트', 'frontend', '프론트엔드', 'ui', '화면', '페이지']):
            user_focus = "⚠️ **사용자 요청**: 프론트엔드 구현을 중심으로 분석하세요."
        elif any(keyword in user_msg_lower for keyword in ['백엔드', 'backend', '서버', 'api', '엔드포인트']):
            user_focus = "⚠️ **사용자 요청**: 백엔드 구현을 중심으로 분석하세요."
        elif any(keyword in user_msg_lower for keyword in ['연동', '연결', '통합', 'integration', '연계']):
            user_focus = "⚠️ **사용자 요청**: 프론트엔드-백엔드 연동을 중심으로 분석하세요."
        elif any(keyword in user_msg_lower for keyword in ['ai', '인공지능', '에이전트']):
            user_focus = "⚠️ **사용자 요청**: AI 기능을 중심으로 분석하세요."
        elif any(keyword in user_msg_lower for keyword in ['github', '깃허브', 'git']):
            user_focus = "⚠️ **사용자 요청**: GitHub 연동 기능을 중심으로 분석하세요."
    
    focus_section = f"\n\n{user_focus}\n" if user_focus else ""
    
    prompt = f"""진행도 분석을 단계별로 수행합니다. 현재는 **1단계: 프로젝트 분석**입니다.
{focus_section}
## 프로젝트 정보:
- 프로젝트 설명: {projectDescription[:200] if projectDescription else '없음'}
- 프로젝트 시작일: {projectStartDate or '미정'}
- 프로젝트 마감일: {projectDueDate or '미정'}
- 총 커밋 수: {len(commits)}개
- 총 Task 수: {len(tasks)}개
{files_section}

## 1단계 작업: 프로젝트 분석 및 핵심 기능 정의
읽은 파일(README, 설정 파일 등)과 프로젝트 설명을 바탕으로 **전체적인 코드나 문서를 점검**하여 다음을 작성하세요:

**⚠️ 매우 중요: 판단 과정을 단계별로 명확히 수행하세요.**

### 1단계: 전체 문서/코드 점검
- README, package.json, 프로젝트 설명 등을 읽어서 프로젝트의 **핵심 기능**을 파악하세요.
- **핵심 기능 정의 기준 (엄격하게 적용):**
  - ✅ **포함해야 할 기능**: 사용자에게 직접 제공되는 비즈니스 기능만 포함
    - 예: 사용자 인증, 프로젝트 관리, Task 관리, AI 기능, GitHub 연동 등
  - ❌ **제외해야 할 기능**: 
    - 인프라 기능 (데이터베이스 연결, JWT 미들웨어, CORS 설정 등)
    - 진행도 조회 (기능이 아닌 메트릭/분석 도구)
    - 기타 지원 기능 (로깅, 에러 핸들링 등)
- 핵심 기능은 프로젝트의 목적을 달성하기 위해 **사용자가 직접 사용하는** 주요 기능입니다.

### 2단계: 핵심 기능 정의 및 중요도 부여
- 파악한 핵심 기능들을 나열하세요.
- **핵심 기능 개수 제한: 3-6개** (너무 많거나 적지 않게)
- 각 핵심 기능에 대해 간단한 설명과 중요도(weight)를 부여하세요.
- **중요도 기준:**
  - weight 1.0: 핵심 비즈니스 기능 (모든 핵심 기능은 1.0으로 설정)
  - weight 0.5 이하: 핵심 기능이 아님 (제외)
- **인프라 관련 기능은 절대 핵심 기능으로 포함하지 마세요.**

다음 JSON 형식으로만 응답하세요:
{{
  "step": 1,
  "projectName": "실제 프로젝트 이름 (README나 package.json에서 확인한 실제 이름, [프로젝트의 실제 이름] 같은 형식이 아닌 실제 값)",
  "projectDescription": "실제 프로젝트 설명 (이 프로젝트는 어떤 프로젝트인지, 핵심 기능과 주요 기능들을 설명. 기술 스택은 생략하고 기능 중심으로 작성. [이 프로젝트는...] 같은 형식이 아닌 실제 설명)",
  "coreFeatures": [
    {{
      "id": "core_feature_1",
      "name": "핵심 기능명 (예: 사용자 인증, 프로젝트 관리, Task 관리, AI 기능 등)",
      "description": "이 핵심 기능에 대한 간단한 설명 (1-2문장)",
      "weight": 1.0
    }},
    {{
      "id": "core_feature_2",
      "name": "다른 핵심 기능명",
      "description": "설명",
      "weight": 1.0
    }}
  ],
  "nextStep": "다음 단계(2단계)에서는 각 핵심 기능에 필요한 세부 기능들을 분석하겠습니다."
}}

⚠️ **매우 중요**: 
- 읽은 파일 내용을 바탕으로 프로젝트가 무엇인지 정확히 파악하세요.
- 프로젝트 이름은 README나 package.json에서 확인한 **실제 이름**을 입력하세요. "[프로젝트의 실제 이름]" 같은 형식이 아닌 실제 값입니다.
- 프로젝트 설명은 **기능 중심으로 작성**하세요. 기술 스택(React, Node.js 등)은 생략하고, 핵심 기능과 주요 기능들을 설명하세요.
- 형식: "이 프로젝트는 [핵심 기능]이 핵심 기능이고, [주요 기능 1], [주요 기능 2], [주요 기능 3] 등의 기능이 있습니다."
- **핵심 기능은 반드시 3-6개로 정의하세요.** (너무 많거나 적지 않게)
- **핵심 기능 정의 검증:**
  - ✅ 사용자에게 직접 제공되는 비즈니스 기능인가?
  - ❌ 인프라 기능(DB 연결, 미들웨어 등)인가? → 제외
  - ❌ 진행도 조회 같은 메트릭/분석 도구인가? → 제외
  - ❌ 중요도가 낮은 기능(프로필 변경 등)인가? → 제외
- **모든 핵심 기능의 weight는 1.0으로 설정하세요.** (weight 0.5 이하는 핵심 기능이 아님)
- 예시: projectName: "To-do-ai-agent" (실제 값), projectDescription: "이 프로젝트는 AI Agent가 핵심 기능이고, 진행도 분석, Task 제안, Task 완료 확인 등의 기능이 있습니다." (기능 중심 설명)
- coreFeatures 예시: [{{id: "auth", name: "사용자 인증", description: "로그인, 회원가입, 로그아웃 등 사용자 인증 기능", weight: 1.0}}, {{id: "project", name: "프로젝트 관리", description: "프로젝트 생성, 수정, 삭제, 조회 등 프로젝트 관리 기능", weight: 1.0}}, {{id: "task", name: "Task 관리", description: "Task 생성, 수정, 삭제, 조회 등 Task 관리 기능", weight: 1.0}}, {{id: "ai", name: "AI 기능", description: "진행도 분석, Task 제안, Task 완료 확인 등 AI 기능", weight: 1.0}}, {{id: "github", name: "GitHub 연동", description: "GitHub 저장소 연동 및 커밋/이슈 조회 기능", weight: 1.0}}]"""
    
    return prompt

def create_progress_analysis_followup_prompt(context, previous_result, user_message, read_files, analyzed_commits, step_number, all_steps):
    """진행도 분석 에이전트 후속 프롬프트 (단계별)"""
    commits = context.get('commits', [])
    tasks = context.get('tasks', [])
    
    # 이전 단계들의 결과 수집
    step1_result = all_steps[0] if len(all_steps) > 0 else {}
    step2_result = all_steps[1] if len(all_steps) > 1 else {}
    step3_result = all_steps[2] if len(all_steps) > 2 else {}
    step4_result = all_steps[3] if len(all_steps) > 3 else {}
    
    # 읽은 파일 내용
    files_section = ""
    if read_files:
        files_section = "\n\n## 📄 읽은 파일 내용:\n\n"
        for f in read_files[-10:]:  # 최근 10개 파일
            path = f.get('path', '')
            content = f.get('content', '')
            if content:
                content_preview = content[:2000] if len(content) > 2000 else content
                files_section += f"### 파일: {path}\n```\n{content_preview}\n```\n\n"
    
    if step_number == 2:
        # 2단계: 기능 분석 (각 핵심 기능에 필요한 세부 기능들 파악)
        core_features = step1_result.get('coreFeatures', [])
        core_features_text = "\n".join([f"- {f.get('name', '')} ({f.get('description', '')})" for f in core_features])
        
        # 사용자 요청 분석 (특정 영역에 집중하라는 요청이 있는지 확인)
        user_focus = ""
        if user_message:
            user_msg_lower = user_message.lower()
            if any(keyword in user_msg_lower for keyword in ['프론트', 'frontend', '프론트엔드', 'ui', '화면', '페이지']):
                user_focus = "⚠️ **사용자 요청**: 프론트엔드(페이지, 컴포넌트) 관련 기능을 우선적으로 분석하세요."
            elif any(keyword in user_msg_lower for keyword in ['백엔드', 'backend', '서버', 'api', '엔드포인트']):
                user_focus = "⚠️ **사용자 요청**: 백엔드(API, 서버) 관련 기능을 우선적으로 분석하세요."
            elif any(keyword in user_msg_lower for keyword in ['연동', '연결', '통합', 'integration', '연계']):
                user_focus = "⚠️ **사용자 요청**: 프론트엔드-백엔드 연동(API 호출, 데이터 전달) 관련 기능을 우선적으로 분석하세요."
        
        focus_section = f"\n\n{user_focus}\n" if user_focus else ""
        
        prompt = f"""진행도 분석 **2단계: 세부 기능 분석**입니다.
{focus_section}
## 이전 단계(1단계) 결과:
프로젝트 이름: {step1_result.get('projectName', 'N/A')}
프로젝트 설명: {step1_result.get('projectDescription', 'N/A')[:200]}...

### 핵심 기능 목록:
{core_features_text}

{files_section}

## 2단계 작업: 각 핵심 기능별 세부 기능 분석
이전 단계에서 정의한 **각 핵심 기능**에 대해, 그 기능을 구현하기 위해 필요한 **세부 기능들**을 나열하세요.

**⚠️ 매우 중요: 판단 과정을 단계별로 명확히 수행하세요.**

### 1단계: 핵심 기능별 세부 기능 파악
- 각 핵심 기능에 대해, 그 기능을 완전히 구현하기 위해 필요한 세부 기능들을 생각해보세요.
- **⚠️ 중요**: 인프라 기능(데이터베이스 연결, JWT 미들웨어, CORS 설정 등)은 포함하지 마세요.
- 예: "사용자 인증" 핵심 기능의 경우 → 로그인 페이지, 회원가입 페이지, 로그인 API, 회원가입 API, 로그아웃 API 등
- **인프라는 핵심 기능이 아니므로 세부 기능에도 포함하지 마세요.**

### 2단계: 세부 기능 분류
- 각 세부 기능을 **페이지, API, 컴포넌트, 테스트/배포** 4가지로만 분류하세요.
- **인프라는 분류하지 마세요.** (인프라는 진행도 분석에서 제외)

**기능 분류 (반드시 다음 4가지로만 분류):**
- **페이지**: 각 페이지 경로 (예: 로그인 페이지, 프로젝트 목록 페이지, AI 어드바이저 페이지 등)
- **API**: 포괄적인 API 그룹 (예: 사용자 인증 API, 프로젝트 관리 API, Task 관리 API, GitHub 연동 API, AI API 등)
- **컴포넌트**: 재사용 가능한 UI 컴포넌트 (예: Task 카드 컴포넌트, 프로젝트 카드 컴포넌트, GitHub 커밋 리스트 컴포넌트 등)
- **테스트/배포**: 테스트 및 배포 관련 기능 (예: 단위 테스트, 통합 테스트, E2E 테스트, CI/CD 파이프라인, 배포 스크립트, Docker 설정 등)
  - **중요**: 프로젝트 특성에 따라 테스트/배포가 필요하지 않을 수 있습니다.
  - **웹 애플리케이션**: 테스트(단위/통합/E2E), CI/CD, 배포 설정 등
  - **API 서버**: 테스트(단위/통합), CI/CD, 배포 설정 등
  - **라이브러리**: 테스트(단위), CI/CD 등
  - **간단한 스크립트/도구**: 테스트/배포가 필요 없을 수 있음 (비율 0%)

다음 JSON 형식으로만 응답하세요:
{{
  "step": 2,
  "requiredFeatures": [
    {{
      "coreFeatureId": "core_feature_1",
      "coreFeatureName": "핵심 기능명",
      "name": "세부 기능명 (예: 로그인 페이지, 사용자 인증 API, 프로젝트 관리 API, 단위 테스트, CI/CD 파이프라인 등)",
      "type": "page|api|component|infrastructure|test_deployment",
      "description": "간단한 설명 (1-2문장)",
      "expectedLocation": "예상 위치 (페이지: 경로, API: 엔드포인트 그룹, 테스트/배포: 테스트 파일 경로 또는 배포 설정 파일)"
    }}
  ],
  "nextStep": "다음 단계(3단계)에서는 소스코드를 확인하여 실제로 구현된 기능을 찾겠습니다."
}}

⚠️ **매우 중요**: 
- **1단계 검증**: 핵심 기능이 3-6개이고, 인프라가 포함되지 않았는지 확인하세요.
- **각 핵심 기능별로** 필요한 세부 기능들을 나열하세요.
- 각 세부 기능은 반드시 **coreFeatureId**와 **coreFeatureName**을 포함해야 합니다.
- 반드시 **페이지, API, 컴포넌트, 테스트/배포** 4가지 분류로만 나누어 나열하세요.
- **⚠️ 인프라 기능은 절대 포함하지 마세요.** (데이터베이스 연결, JWT 미들웨어, CORS 설정 등은 진행도 분석에서 제외)
- **핵심 기능에 속하는 세부 기능**: 페이지, API, 컴포넌트만 포함하세요.
- **테스트/배포**: 프로젝트 특성에 따라 테스트/배포 기능을 포함하세요.
  - 웹 애플리케이션이나 API 서버: 단위 테스트, 통합 테스트, E2E 테스트, CI/CD 파이프라인, 배포 설정 등
  - 라이브러리: 단위 테스트, CI/CD 등
  - 간단한 스크립트: 테스트/배포가 필요 없을 수 있음
- 각 핵심 기능당 **3-8개의 세부 기능**을 나열하세요. (너무 많거나 적지 않게)
- **핵심 기능에 속하지 않는 사소한 기능(프로필 변경, 설정 페이지 등)은 제외하세요.**
- **검증**: 각 핵심 기능당 최소 3개 이상의 세부 기능이 있는지 확인하세요."""
    
    elif step_number == 3:
        # 3단계: 정보 추출 (소스코드에서 구현된 기능 확인)
        required_features = step2_result.get('requiredFeatures', [])
        required_features_text = "\n".join([f"- {f.get('name', '')} ({f.get('type', 'unknown')})" for f in required_features[:15]])
        
        # 읽은 파일 목록 생성 (검증을 위해)
        read_files_list = []
        if read_files:
            read_files_list = [f.get('path', '') for f in read_files]
        read_files_summary = "\n".join([f"- {path}" for path in read_files_list[:30]]) if read_files_list else "없음"
        
        # 사용자 요청 분석 (특정 영역에 집중하라는 요청이 있는지 확인)
        user_focus = ""
        if user_message:
            user_msg_lower = user_message.lower()
            if any(keyword in user_msg_lower for keyword in ['프론트', 'frontend', '프론트엔드', 'ui', '화면', '페이지']):
                user_focus = "⚠️ **사용자 요청**: 프론트엔드 파일(페이지, 컴포넌트)을 우선적으로 확인하세요."
            elif any(keyword in user_msg_lower for keyword in ['백엔드', 'backend', '서버', 'api', '엔드포인트']):
                user_focus = "⚠️ **사용자 요청**: 백엔드 파일(라우트, 컨트롤러)을 우선적으로 확인하세요."
            elif any(keyword in user_msg_lower for keyword in ['연동', '연결', '통합', 'integration', '연계']):
                user_focus = "⚠️ **사용자 요청**: 프론트엔드 API 호출 파일과 백엔드 라우트 파일을 함께 확인하여 연동 상태를 분석하세요."
        
        focus_section = f"\n\n{user_focus}\n" if user_focus else ""
        
        prompt = f"""진행도 분석 **3단계: 구현된 기능 확인**입니다.
{focus_section}

## 이전 단계 결과:

### 1단계: 프로젝트 분석
프로젝트 이름: {step1_result.get('projectName', 'N/A')}

### 2단계: 필요한 기능 분석
필요한 기능 목록:
{required_features_text}

{files_section}

## 3단계 작업: 구현된 기능 확인 및 핵심 기능별 진행도 계산
위에서 읽은 파일 내용을 **반드시 활용하여** 실제 소스코드에서 확인된 기능을 찾고, **각 핵심 기능별로 진행도를 계산**하세요.

**⚠️ 매우 중요: 판단 과정을 단계별로 명확히 수행하세요.**

### 1단계: 2단계 결과 검증
- 2단계에서 정의한 **모든 {len(required_features)}개 기능**을 확인했는지 검증하세요.
- 각 핵심 기능별로 필요한 세부 기능 수를 확인하세요.
- 읽은 파일 목록을 확인하여 필요한 파일을 모두 읽었는지 검증하세요.

### 2단계: 파일 내용 분석
- 읽은 각 파일의 내용을 **하나씩 확인**하세요.
- 각 파일에서 어떤 기능이 구현되어 있는지 **구체적으로 파악**하세요.
- 예: routes/user.js 파일을 읽었다면, 그 안의 모든 엔드포인트(/api/user/login, /api/user/register 등)를 찾아서 나열하세요.
- **2단계에서 예상한 위치의 파일을 우선적으로 확인**하세요.

### 3단계: 소스코드 기반 기능 검증 (엄격하게)
- **⚠️ 매우 중요**: 읽은 파일 내용을 기반으로 실제로 구현된 기능만 확인하세요.
- **API 검증 방법**:
  1. 라우트 파일(예: backend/routes/user.js)을 읽었다면, 그 안에 실제로 정의된 엔드포인트를 확인하세요.
  2. 예: `router.post('/login', ...)` 또는 `app.post('/api/user/login', ...)` 형태로 정의되어 있어야 합니다.
  3. 엔드포인트가 파일에 없으면 구현되지 않은 것입니다.
- **페이지/컴포넌트 검증 방법**:
  1. 파일 경로가 읽은 파일 목록에 있는지 확인하세요.
  2. 파일 내용에서 해당 컴포넌트/페이지가 실제로 export되어 있는지 확인하세요.
- **⚠️ 인프라 기능은 절대 포함하지 마세요.** (데이터베이스 연결, JWT 미들웨어 등은 진행도 분석에서 완전히 제외)

### 4단계: 기능 분류 및 핵심 기능 매핑
- 찾은 기능을 **페이지, API, 컴포넌트, 테스트/배포** 4가지로만 분류하세요.
- 각 기능이 **어떤 핵심 기능에 속하는지** 매핑하세요 (coreFeatureId 사용).
- **2단계에서 정의한 requiredFeatures와 일대일로 매칭**하세요.
- API의 경우, 비슷한 엔드포인트끼리 묶어서 그룹화하세요.
- 예: /api/user/login, /api/user/register, /api/user/logout → "사용자 인증 API" 그룹 → coreFeatureId: "auth"
- **테스트/배포**: 테스트 파일(*.test.js, *.spec.js, __tests__/, tests/ 등)이나 CI/CD 설정 파일(.github/workflows/, .gitlab-ci.yml, Dockerfile 등)을 확인하세요.

### 5단계: 핵심 기능별 진행도 계산
- 각 핵심 기능에 대해:
  - 필요한 세부 기능 수 (2단계에서 정의한 것, **인프라 제외**) - **정확히 세기**
  - 구현된 세부 기능 수 (실제로 소스코드에서 확인된 것, **인프라 제외**) - **정확히 세기**
  - 진행도 = (구현된 세부 기능 수 / 필요한 세부 기능 수) × 100
- 예: "사용자 인증" 핵심 기능의 경우
  - 필요한 세부 기능: 5개 (로그인 페이지, 회원가입 페이지, 로그인 API, 회원가입 API, 로그아웃 API)
  - 구현된 세부 기능: 4개 (로그인 페이지, 회원가입 페이지, 로그인 API, 회원가입 API)
  - 진행도: (4 / 5) × 100 = 80%
- **⚠️ 인프라 기능은 절대 포함하지 마세요.** (진행도 계산에서 완전히 제외)

**중요**: 읽은 파일에서 **가능한 대부분의 기능을 확인**하세요. 일부만 확인하지 말고 모든 기능을 찾아보세요.

**프로젝트 특성에 따른 유동적 소제목 분류:**
- 프로젝트 구조에 따라 소제목을 유동적으로 나누세요.
- **웹 애플리케이션**: 페이지, API, 컴포넌트, 인프라, 테스트/배포
- **API 서버**: 엔드포인트, 서비스, 인프라, 테스트/배포
- **라이브러리**: 모듈, 함수, 유틸리티, 테스트
- **프로젝트에 페이지나 컴포넌트가 없다면**: 해당 소제목을 생략하고 다른 소제목에 집중하세요.
- **테스트/배포가 없는 프로젝트**: 간단한 스크립트나 도구의 경우 테스트/배포 소제목을 생략할 수 있습니다.

**표시 형식 (프로젝트 특성에 따라 유동적으로 분류):**
- **페이지** (웹 앱인 경우): `페이지명 /경로/경로/.jsx` (예: 로그인 페이지 /src/pages/Login.jsx)
  - 읽은 페이지 파일들에서 각 페이지의 역할과 경로를 확인하세요.
  - 페이지가 없다면 이 소제목을 생략하세요.
- **API**: 비슷한 API끼리 묶어서 그룹화하여 표시
  - 예: **사용자 인증 API** /api/user/login, /api/user/logout, /api/user/register, /api/user/signup, /api/user/me
  - 예: **프로젝트 관리 API** /api/project/create, /api/project/update, /api/project/delete, /api/project/info, /api/project/list, /api/project/members
  - 예: **Task 관리 API** /api/task/create, /api/task/update, /api/task/delete, /api/task/info, /api/task/assign, /api/task/status
  - 예: **GitHub 연동 API** /api/github/sync/:projectId, /api/github/commits/:projectId, /api/github/issues/:projectId, /api/github/branches/:projectId
  - 예: **AI API** /api/ai/chat, /api/ai/task-suggestion, /api/ai/progress-analysis, /api/ai/task-completion-check
  - 예: **진행도 조회 API** /api/progress/project/:projectId
  - 읽은 라우트 파일들에서 **모든 엔드포인트를 찾아서** 비슷한 것끼리 묶어서 그룹화하세요.
- **컴포넌트** (웹 앱인 경우): `컴포넌트명 /경로/경로/.jsx` (예: Task 카드 컴포넌트 /src/components/tasks/TaskCard.jsx)
  - 읽은 컴포넌트 파일들에서 재사용 가능한 UI 컴포넌트를 확인하세요.
  - 예: ChatBot 컴포넌트, TaskView 컴포넌트, ProjectCard 컴포넌트, GitHub CommitList 컴포넌트 등
  - 컴포넌트가 없다면 이 소제목을 생략하세요.
- **인프라**: `기능명 /위치` (예: 데이터베이스 연결 /database/db.js, JWT 인증 미들웨어 /middleware/auth.js)
  - 데이터베이스 연결, 인증 미들웨어, 파일 업로드, CORS 설정 등 백엔드 인프라 기능을 확인하세요.
- **테스트/배포** (프로젝트 특성에 따라 있을 수 있음): `기능명 /위치` (예: 단위 테스트 /tests/unit/, CI/CD 파이프라인 /.github/workflows/ci.yml, Docker 설정 /Dockerfile)
  - 테스트 파일(*.test.js, *.spec.js, __tests__/ 등), CI/CD 설정(.github/workflows/, .gitlab-ci.yml 등), 배포 설정(Dockerfile, docker-compose.yml 등)을 확인하세요.
  - 프로젝트 특성에 따라 테스트/배포가 필요 없을 수 있습니다 (간단한 스크립트 등).

**파일 검색 전략:**
- 읽은 파일에서 페이지나 컴포넌트가 없다고 판단되면, 다른 UI 관련 파일들(views/, screens/, ui/ 등)을 찾아보세요.
- 프로젝트 구조를 파악하여 적절한 디렉토리에서 파일을 찾으세요.

읽은 파일에서 실제로 확인된 것만 나열하세요. 추측하지 마세요.

다음 JSON 형식으로만 응답하세요:
{{
  "step": 3,
  "implementedFeatures": [
    {{
      "coreFeatureId": "core_feature_1",
      "coreFeatureName": "핵심 기능명",
      "name": "기능명 (API는 그룹명, 예: 사용자 인증 API, 프로젝트 관리 API, 단위 테스트, CI/CD 파이프라인 등)",
      "type": "page|api|component|infrastructure|test_deployment",
      "location": "페이지: /경로/경로/.jsx 또는 API: /엔드포인트, /엔드포인트, /엔드포인트 (모든 관련 엔드포인트 나열) 또는 컴포넌트: /경로/경로/.jsx 또는 인프라: /위치 또는 테스트/배포: /테스트_파일_경로 또는 /배포_설정_파일",
      "filePath": "주요 파일 경로 (1-2개)"
    }}
  ],
  "coreFeatureProgress": [
    {{
      "coreFeatureId": "core_feature_1",
      "coreFeatureName": "핵심 기능명",
      "requiredCount": 5,
      "implementedCount": 4,
      "progress": 80.0
    }}
  ],
  "nextStep": "다음 단계(4단계)에서는 미구현 기능을 분석하겠습니다."
}}

⚠️ **매우 중요**: 
- **2단계 검증**: 2단계에서 정의한 모든 {len(required_features)}개 기능을 확인했는지 검증하세요.
- **⚠️ 소스코드 기반 검증**: 읽은 파일 내용을 기반으로 실제로 구현된 기능만 확인하세요.
  - API의 경우: 라우트 파일에서 실제로 정의된 엔드포인트만 확인 (예: `router.post('/login', ...)`)
  - 페이지/컴포넌트의 경우: 파일이 존재하고 실제로 export되어 있는지 확인
- **⚠️ 인프라 기능은 절대 포함하지 마세요.** (데이터베이스 연결, JWT 미들웨어, CORS 설정 등은 진행도 분석에서 완전히 제외)
- 읽은 파일 내용을 무시하지 말고, 실제로 파일에서 확인된 기능만 나열하세요.
- **반드시 페이지, API, 컴포넌트, 테스트/배포 4가지 분류로만 나누어 나열하세요.**
- **핵심 기능 위주로 확인하세요**: 사용자 인증, 프로젝트 관리, Task 관리, AI 기능, GitHub 연동 등은 핵심 기능입니다.
- **사소한 기능은 제외하세요**: 프로필 변경, 설정 페이지, UI 개선 등은 제외하세요.
- **API는 가능한 대부분의 엔드포인트를 찾아서 비슷한 것끼리 묶어서 그룹화하세요.**
- 예를 들어, routes/user.js 파일을 읽었다면 그 안의 모든 엔드포인트를 찾아서 "사용자 인증 API" 그룹으로 묶으세요.
- 페이지는 경로만, API는 엔드포인트를 포괄적으로 나열하세요.
- 컴포넌트는 재사용 가능한 UI 컴포넌트만 나열하세요.
- **테스트/배포**: 테스트 파일이나 CI/CD 설정 파일을 확인하세요. 프로젝트 특성에 따라 없을 수 있습니다.
- **핵심 기능별 진행도 계산 검증**: 각 핵심 기능의 requiredCount와 implementedCount가 정확한지 확인하세요. (인프라 제외)
- 세부 설명은 생략하고 위치만 명시하세요."""
    
    elif step_number == 4:
        # 4단계: 미구현 기능 분석
        required_features = step2_result.get('requiredFeatures', [])
        implemented_features = step3_result.get('implementedFeatures', [])
        
        # 구현된 기능 이름들을 정확히 추출 (API 그룹명, 페이지명 등)
        implemented_names = []
        for feat in implemented_features:
            name = feat.get('name', '')
            feat_type = feat.get('type', '')
            location = feat.get('location', '')
            
            # API의 경우 그룹명과 개별 엔드포인트 모두 확인
            if feat_type == 'api':
                implemented_names.append(name)  # API 그룹명
                # location에서 개별 엔드포인트 추출
                if location:
                    endpoints = [e.strip() for e in location.split(',')]
                    for endpoint in endpoints:
                        if endpoint.startswith('/api/'):
                            # 엔드포인트에서 기능명 추출 (예: /api/project/create -> 프로젝트 생성)
                            parts = endpoint.replace('/api/', '').split('/')
                            if len(parts) >= 2:
                                resource = parts[0]  # project, task, user 등
                                action = parts[1]  # create, update, delete 등
                                implemented_names.append(f"{resource}_{action}")
            else:
                implemented_names.append(name)
        
        prompt = f"""진행도 분석 **4단계: 미구현 기능 분석**입니다.

## 이전 단계 결과:

### 1단계: 프로젝트 분석
프로젝트 이름: {step1_result.get('projectName', 'N/A')}
프로젝트 설명: {step1_result.get('projectDescription', 'N/A')[:200]}...

### 2단계: 필요한 기능 분석
필요한 기능 수: {len(required_features)}개

### 3단계: 구현된 기능 확인
구현된 기능 수: {len(implemented_features)}개
구현된 기능 목록:
{json.dumps(implemented_features, ensure_ascii=False, indent=2)[:2000]}

{files_section}

## 4단계 작업: 미구현 기능 분석
필요한 기능 목록과 구현된 기능 목록을 **정확히** 비교하여, 아직 구현되지 않은 기능을 찾으세요.

**⚠️ 매우 중요: 판단 과정을 단계별로 명확히 수행하세요.**

### 0단계: 이전 단계 결과 검증
- 2단계: 필요한 기능 수 = {len(required_features)}개
- 3단계: 구현된 기능 수 = {len(implemented_features)}개
- **검증**: 2단계와 3단계의 카운트가 일치하는지 확인하세요.

### 1단계: 필요한 기능 목록 확인
- 2단계에서 나열한 "필요한 기능" 목록을 **하나씩 확인**하세요.
- 각 기능이 무엇인지 명확히 이해하세요.
- **전체 {len(required_features)}개 기능을 모두 확인**해야 합니다.

### 2단계: 구현 여부 확인 (엄격하게)
- 각 "필요한 기능"이 "구현된 기능" 목록에 있는지 **하나씩 확인**하세요.
- **체크리스트 방식으로 하나씩 확인**하세요:
  - 기능명이 정확히 일치하는가?
  - API의 경우: API 그룹명과 개별 엔드포인트 모두 확인
  - 페이지/컴포넌트의 경우: 파일 경로 확인
- API의 경우:
  - API 그룹명을 확인하세요 (예: "프로젝트 관리 API")
  - 해당 그룹의 location에 개별 엔드포인트가 나열되어 있습니다.
  - 예: "프로젝트 관리 API"의 location에 /api/project/create가 있다면, "프로젝트 생성" 기능은 이미 구현된 것입니다.
- 페이지/컴포넌트의 경우:
  - 기능명과 파일 경로를 확인하세요.
  - 읽은 파일 목록에 해당 파일이 있다면 구현된 것입니다.

### 3단계: 미구현 기능 선별
- 2단계에서 "구현되지 않음"으로 확인된 기능만 "미구현 기능" 목록에 추가하세요.
- **이미 구현된 기능을 미구현으로 분류하지 마세요.**
- 각 미구현 기능에 대해 왜 필요한지, 어디에 있어야 하는지 명시하세요.

### 4단계: 카운트 검증 (엄격하게)
- **필수 검증 공식**: 필요한 기능 수 ({len(required_features)}개) = 구현된 기능 수 ({len(implemented_features)}개) + 미구현 기능 수 (X개)
- **정확히 일치해야 합니다.** 불일치한다면:
  1. 2단계 결과를 다시 확인하세요.
  2. 3단계 결과를 다시 확인하세요.
  3. 각 기능을 하나씩 다시 비교하세요.
- 불일치 시: 재확인 후 다시 응답하세요.

**매우 중요:**
- 구현된 기능 목록을 **자세히 확인**하세요. API 그룹에 포함된 개별 엔드포인트도 확인하세요.
- 예를 들어, "프로젝트 관리 API"에 /api/project/create가 포함되어 있다면, "프로젝트 생성" 기능은 이미 구현된 것입니다.
- 읽은 파일 내용을 확인하여 실제로 구현된 기능인지 검증하세요.
- **이미 구현된 기능을 미구현으로 분류하지 마세요.**

다음 JSON 형식으로만 응답하세요:
{{
  "step": 4,
  "missingFeatures": [
    {{
      "name": "기능명",
      "reason": "왜 필요한지",
      "expectedLocation": "예상 파일 위치"
    }}
  ],
  "nextStep": "다음 단계(5단계)에서는 평가 및 진행도 계산을 수행하겠습니다."
}}

⚠️ **매우 중요**: 
- 필요한 기능 중 **정말로** 구현된 기능에 없는 것만 나열하세요.
- 구현된 기능 목록을 자세히 확인하여 중복 분류를 피하세요.
- 각 미구현 기능에 대해 왜 필요한지, 어디에 있어야 하는지 명시하세요."""
    
    else:
        # 5단계 이상: 평가 및 진행도 계산
        required_features = step2_result.get('requiredFeatures', [])
        implemented_features = step3_result.get('implementedFeatures', [])
        missing_features = step4_result.get('missingFeatures', []) if len(all_steps) > 3 else []
        
        project_name = step1_result.get('projectName', '프로젝트')
        project_desc = step1_result.get('projectDescription', '')
        
        # 진행도 계산
        total_required = len(required_features)
        total_implemented = len(implemented_features)
        total_missing = len(missing_features)
        progress = round((total_implemented / total_required * 100) if total_required > 0 else 0, 1)
        
        # 구현된 기능 목록 생성 (간단하게)
        implemented_list = []
        for feat in implemented_features:
            name = feat.get('name', '')
            feat_type = feat.get('type', 'other')
            location = feat.get('location', feat.get('filePath', ''))
            if feat_type == 'page':
                implemented_list.append(f"- **{name}** {location}")
            elif feat_type == 'api':
                implemented_list.append(f"- **{name}** {location}")
            else:
                implemented_list.append(f"- **{name}** {location}")
        
        # 미구현 기능 목록 생성 (간단하게)
        missing_list = []
        for feat in missing_features:
            name = feat.get('name', '')
            expected_loc = feat.get('expectedLocation', '')
            missing_list.append(f"- **{name}**: {expected_loc}")
        
        prompt = f"""진행도 분석 **5단계: 평가 및 진행도 계산**입니다.

## 이전 단계 결과 요약:

### 1단계: 프로젝트 분석
프로젝트 이름: {project_name}
프로젝트 설명: {project_desc[:200]}...

### 2단계: 필요한 기능 분석
필요한 기능 목록:
{json.dumps(required_features, ensure_ascii=False, indent=2)[:1500]}
**총 필요한 기능 수: {total_required}개**

### 3단계: 구현된 기능 확인
구현된 기능 목록:
{json.dumps(implemented_features, ensure_ascii=False, indent=2)[:2000]}
**총 구현된 기능 수: {total_implemented}개**

### 4단계: 미구현 기능 분석
미구현 기능 목록:
{json.dumps(missing_features, ensure_ascii=False, indent=2)[:1000]}
**총 미구현 기능 수: {total_missing}개**

## 5단계 작업: 정확한 평가 및 진행도 계산

**⚠️ 매우 중요: 판단 과정을 단계별로 명확히 수행하세요.**

### 0단계: 모든 단계 결과 검증
- **1단계 검증**: 핵심 기능이 3-6개이고, 인프라가 포함되지 않았는지 확인
- **2단계 검증**: 각 핵심 기능당 3-8개의 세부 기능이 있는지 확인
- **3단계 검증**: 핵심 기능별 진행도가 계산되었는지 확인
- **4단계 검증**: 필요한 기능 수 = 구현된 기능 수 + 미구현 기능 수 (정확히 일치해야 함)

### 1단계: 기능 카운트 최종 검증 (엄격하게)
- 필요한 기능 수: {total_required}개
- 구현된 기능 수: {total_implemented}개
- 미구현 기능 수: {total_missing}개
- **필수 검증 공식**: {total_required} = {total_implemented} + {total_missing}
- **정확히 일치해야 합니다.** 불일치한다면:
  1. 2단계 결과를 다시 확인하세요.
  2. 3단계 결과를 다시 확인하세요.
  3. 4단계 결과를 다시 확인하세요.
  4. 각 기능을 하나씩 다시 비교하세요.
- 불일치 시: 재확인 후 다시 응답하세요.

### 2단계: 구현 여부 재확인 (이중 확인)
- 각 "필요한 기능"이 "구현된 기능" 목록에 있는지 **하나씩 확인**하세요.
- API의 경우, API 그룹명뿐만 아니라 개별 엔드포인트도 확인하세요.
- 예: "프로젝트 생성" 기능이 필요하다면, "프로젝트 관리 API"에 /api/project/create가 포함되어 있는지 확인하세요.
- 읽은 파일 내용을 참고하여 실제로 구현되어 있는지 검증하세요.
- **이미 구현된 기능을 미구현으로 분류하지 마세요.**

### 3단계: 테스트/배포 비율 결정
- 프로젝트 특성을 고려하여 테스트/배포가 필요한지 판단하세요.
- **웹 애플리케이션이나 API 서버**: 테스트/배포 비율 10~20% 권장
- **라이브러리**: 테스트 비율 10~15% 권장
- **간단한 스크립트나 도구**: 테스트/배포 비율 0~5%
- **프로덕션 수준의 프로젝트**: 테스트/배포 비율 15~20%
- **프로토타입이나 MVP**: 테스트/배포 비율 5~10%
- 테스트/배포 기능이 필요한 기능 목록에 포함되어 있는지 확인하세요.
- 테스트/배포 기능이 없다면 비율을 0%로 설정하세요.

### 4단계: 기본 진행도 계산
- **기본 계산식**: (구현된 기능 수 / 필요한 기능 수) × 100
- 계산: ({total_implemented} / {total_required}) × 100 = {progress}%
- 이 값은 기능 구현 진행도입니다.

### 5단계: 테스트/배포 진행도 계산 및 최종 진행도 산출
- 테스트/배포 관련 기능이 있는 경우:
  - 테스트/배포 필요한 기능 수: requiredFeatures에서 type이 "test_deployment"인 기능 수
  - 테스트/배포 구현된 기능 수: implementedFeatures에서 type이 "test_deployment"인 기능 수
  - 테스트/배포 진행도 = (구현된 테스트/배포 기능 수 / 필요한 테스트/배포 기능 수) × 100
  - 테스트/배포 비율: 프로젝트 특성에 따라 0~20% (위 3단계에서 결정)
  - **최종 진행도 계산**: 기본 진행도 × (1 - 테스트/배포_비율) + 테스트/배포_진행도 × 테스트/배포_비율
  - 예: 기본 진행도 80%, 테스트/배포 비율 15%, 테스트/배포 진행도 50% → 최종 진행도 = 80% × 0.85 + 50% × 0.15 = 75.5%
- 테스트/배포 관련 기능이 없는 경우:
  - 테스트/배포 비율 = 0%
  - 최종 진행도 = 기본 진행도

### 6단계: 가중치 적용 (선택사항)
- 핵심 기능과 사소한 기능을 구분하여 가중치를 적용할 수 있습니다.
- 하지만 기본 진행도는 위 계산식에 따릅니다.

**중요 체크사항:**
- 구현된 API가 필요한 모든 API를 포함하는지 확인하세요.
- 읽은 파일에서 확인된 API 엔드포인트가 필요한 기능 목록과 일치하는지 검증하세요.
- 누락된 API가 있는지 확인하세요.

다음 JSON 형식으로만 응답하세요:
{{
  "step": 5,
  "currentProgress": {progress},
  "completedFeaturesCount": {total_implemented},
  "requiredFeaturesCount": {total_required},
  "missingFeaturesCount": {total_missing},
  "narrativeResponse": "[프로젝트 설명]\\n\\n### 구현된 기능\\n[구현된 기능 목록]\\n\\n### 미구현 기능\\n[미구현 기능 목록]\\n\\n### 평가\\n[핵심 기능별 진행도 표시 또는 전체 진행도]\\n\\n전체 진행도: {progress}% (완성된 기능 {total_implemented}개, 구현해야 할 기능 {total_missing}개)\\n\\n**예상 완성일**: [현재 진행 속도를 고려한 예상 완성일 또는 '미정']\\n\\n**총평**: [프로젝트의 현재 상태를 2-3줄로 요약한 총평. 핵심 기능 구현 상태, 주요 미구현 기능, 전체적인 프로젝트 상태를 간결하게 설명]",
  "activityTrend": "increasing|stable|decreasing",
  "delayRisk": "Low|Medium|High",
  "estimatedCompletionDate": "YYYY-MM-DD 또는 null",
  "insights": ["인사이트 1", "인사이트 2", "인사이트 3"],
  "recommendations": ["제안 1", "제안 2", "제안 3"]
}}

⚠️ **매우 중요**: 
- narrativeResponse의 평가 섹션은 반드시 "완성된 기능 {total_implemented}개, 구현해야 할 기능 {total_missing}개로 진행도 {progress}%입니다." 형식으로 작성하세요.
- currentProgress는 반드시 {progress}와 일치해야 합니다 (계산: {total_implemented}/{total_required}×100).
- completedFeaturesCount, requiredFeaturesCount, missingFeaturesCount를 정확히 입력하세요.
- 총평은 2-3줄로 간결하게 작성하세요.
- API 완전성을 체크하여 누락된 API가 있는지 확인하세요."""
    
    return prompt

def create_task_completion_initial_prompt(context, user_message, read_files, analyzed_commits):
    """Task 완료 확인 에이전트 초기 프롬프트"""
    task = context.get('task')
    commits = context.get('commits', [])
    projectDescription = context.get('projectDescription', '')
    
    if not task:
        return "Task 정보가 필요합니다."
    
    return create_initial_completion_prompt(task, commits, projectDescription)

def create_task_completion_followup_prompt(context, previous_result, user_message, read_files, analyzed_commits):
    """Task 완료 확인 에이전트 후속 프롬프트"""
    task = context.get('task')
    commits = context.get('commits', [])
    projectDescription = context.get('projectDescription', '')
    
    if not task:
        return "Task 정보가 필요합니다."
    
    # 읽은 파일 정보 추가
    files_context = ""
    if read_files:
        files_context = "\n\n## 읽은 파일 내용:\n"
        for file_info in read_files:
            content = file_info.get('content', '')[:1000]  # 최대 1000자
            files_context += f"파일: {file_info.get('path', '')}\n{content}\n---\n"
    
    base_prompt = create_followup_completion_prompt(task, previous_result, commits, projectDescription)
    
    return base_prompt + files_context + "\n\n위 파일 내용을 참고하여 최종 판단하세요."

def create_general_qa_initial_prompt(context, user_message, read_files, analyzed_commits):
    """일반 QA 에이전트 초기 프롬프트"""
    commits = context.get('commits', [])
    issues = context.get('issues', [])
    tasks = context.get('tasks', [])
    projectDescription = context.get('projectDescription', '')
    githubRepo = context.get('githubRepo', '')
    
    # 프로젝트 통계 계산
    task_stats = {
        'total': len(tasks),
        'todo': sum(1 for t in tasks if t.get('status') == 'todo'),
        'in_progress': sum(1 for t in tasks if t.get('status') == 'in_progress'),
        'done': sum(1 for t in tasks if t.get('status') == 'done')
    }
    
    commit_stats = {
        'total': len(commits),
        'total_lines_added': sum(c.get('linesAdded', 0) or 0 for c in commits),
        'total_lines_deleted': sum(c.get('linesDeleted', 0) or 0 for c in commits),
        'total_files_changed': sum(c.get('filesChanged', 0) or 0 for c in commits)
    }
    
    issue_stats = {
        'total': len(issues),
        'open': sum(1 for i in issues if i.get('state') == 'open'),
        'closed': sum(1 for i in issues if i.get('state') == 'closed')
    }
    
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    recent_commits = sum(1 for c in commits if c.get('date') and 
                        datetime.fromisoformat(c.get('date').replace('Z', '+00:00')) >= week_ago)
    
    # 최근 커밋 상세 정보
    recent_commits_detail = []
    for commit in commits[:10]:
        recent_commits_detail.append({
            "message": commit.get('message', '')[:150],
            "date": commit.get('date', ''),
            "author": commit.get('author', ''),
            "linesAdded": commit.get('linesAdded', 0),
            "linesDeleted": commit.get('linesDeleted', 0)
        })
    
    # 최근 Task 상세 정보
    recent_tasks_detail = []
    for task in tasks[:10]:
        recent_tasks_detail.append({
            "title": task.get('title', ''),
            "status": task.get('status', 'todo'),
            "description": task.get('description', '')[:200],
            "dueDate": task.get('dueDate', ''),
            "assignedUserId": task.get('assignedUserId', '')
        })
    
    prompt = f"""당신은 프로젝트 관리 AI 어시스턴트입니다. 사용자의 질문에 대해 프로젝트 정보를 바탕으로 **구체적이고 상세하며 친절하게** 답변하세요.

⚠️ 중요: 반드시 한국어로만 응답하고, JSON 형식으로만 응답하세요.

## 사용자 질문
"{user_message}"

## 프로젝트 정보
- 프로젝트 설명: {projectDescription[:500] if projectDescription else '설명 없음'}
- GitHub 저장소: {githubRepo if githubRepo else '연결되지 않음'}

## 프로젝트 통계
**Task (작업)**
- 전체: {task_stats['total']}개
- 대기 중: {task_stats['todo']}개 ({task_stats['todo']/task_stats['total']*100 if task_stats['total'] > 0 else 0:.1f}%)
- 진행 중: {task_stats['in_progress']}개 ({task_stats['in_progress']/task_stats['total']*100 if task_stats['total'] > 0 else 0:.1f}%)
- 완료: {task_stats['done']}개 ({task_stats['done']/task_stats['total']*100 if task_stats['total'] > 0 else 0:.1f}%)

**커밋**
- 전체: {commit_stats['total']}개
- 추가된 라인: {commit_stats['total_lines_added']:,}줄
- 삭제된 라인: {commit_stats['total_lines_deleted']:,}줄
- 변경된 파일: {commit_stats['total_files_changed']}개
- 최근 7일 커밋: {recent_commits}개

**이슈**
- 전체: {issue_stats['total']}개
- 열림: {issue_stats['open']}개
- 닫힘: {issue_stats['closed']}개

## 최근 커밋 상세 (최근 {len(recent_commits_detail)}개)
{json.dumps(recent_commits_detail, ensure_ascii=False, indent=2)[:2000]}

## 최근 Task 상세 (최근 {len(recent_tasks_detail)}개)
{json.dumps(recent_tasks_detail, ensure_ascii=False, indent=2)[:2000]}

## 답변 규칙
1. 제공된 프로젝트 정보와 통계를 활용하여 사용자 질문에 **구체적이고 상세하게** 답변하세요.
2. 질문이 프로젝트와 관련이 있고 위 정보로 답변할 수 있다면, 친절하고 **자세하며 유용한** 답변을 제공하세요.
3. 질문에 대한 답변을 할 수 없는 경우 (예: 프로젝트와 무관한 질문, 개인정보, 외부 정보 등), 정중하게 거부하세요.
4. 프로젝트에 대한 일반적인 질문(설명, 통계, 상태, 커밋 수, 작업 수 등)은 위 정보를 바탕으로 **구체적인 숫자와 예시를 포함하여** 답변하세요.
5. 답변은 친절하고 자연스러운 한국어로 작성하세요.
6. 숫자는 쉼표를 사용하여 읽기 쉽게 표시하세요.
7. 가능한 한 **구체적이고 상세하며 유용한 정보**를 제공하세요.
8. 관련 통계, 예시, 추세 등을 포함하여 답변을 풍부하게 만드세요.

## 응답 형식
다음 JSON 형식으로만 응답하세요 (반드시 한국어로):
{{
  "can_answer": true 또는 false,
  "message": "사용자 질문에 대한 **구체적이고 상세한** 답변을 한국어로 작성 (친절하고 자연스럽게, 최소 3-5문장 이상)",
  "details": {{
    "used_statistics": ["사용한 통계 정보 1", "사용한 통계 정보 2"],
    "source": "정보 출처 (예: '프로젝트 통계', '커밋 데이터')",
    "examples": ["관련 예시 1", "관련 예시 2"]
  }},
  "sources": ["정보 출처 1", "정보 출처 2"],
  "relatedInfo": {{
    "keyMetric": "주요 지표",
    "trend": "추세 설명"
  }}
}}

만약 답변할 수 없는 질문인 경우:
{{
  "can_answer": false,
  "message": "정중한 거부 메시지를 한국어로 작성",
  "suggestion": "대신 사용할 수 있는 기능 제안"
}}"""
    
    return prompt

def create_general_qa_followup_prompt(context, previous_result, user_message, read_files, analyzed_commits):
    """일반 QA 에이전트 후속 프롬프트"""
    prompt = f"""이전 답변을 보완하여 더 정확하고 상세한 답변을 제공하세요.

## 사용자 질문
"{user_message}"

## 이전 답변:
{json.dumps(previous_result, ensure_ascii=False, indent=2)[:1000]}

## 읽은 파일:
{json.dumps([f.get('path', '') for f in read_files], ensure_ascii=False)[:500]}

위 파일 내용을 참고하여 더 정확하고 구체적인 답변을 제공하세요. JSON 형식으로만 응답하세요."""
    return prompt

def create_task_assignment_initial_prompt(context, user_message, read_files, analyzed_commits):
    """Task 할당 추천 에이전트 초기 프롬프트"""
    task_title = context.get('taskTitle', '')
    task_description = context.get('taskDescription', '')
    project_members_with_tags = context.get('projectMembersWithTags', [])
    
    return create_task_assignment_prompt(task_title, task_description, project_members_with_tags)

def create_task_assignment_followup_prompt(context, previous_result, user_message, read_files, analyzed_commits):
    """Task 할당 추천 에이전트 후속 프롬프트"""
    task_title = context.get('taskTitle', '')
    task_description = context.get('taskDescription', '')
    project_members_with_tags = context.get('projectMembersWithTags', [])
    
    prompt = f"""이전 분석 결과를 바탕으로 더 정확한 Task 할당 추천을 수행하세요.

## Task 정보:
제목: {task_title}
설명: {task_description}

## 이전 분석 결과:
{json.dumps(previous_result, ensure_ascii=False, indent=2)[:1000]}

## 읽은 파일:
{json.dumps([f.get('path', '') for f in read_files], ensure_ascii=False)[:500]}

위 파일 내용을 참고하여 Task에 필요한 기술 스택과 경험을 더 정확히 파악하고, 적합한 담당자를 추천하세요. JSON 형식으로만 응답하세요."""
    return prompt

