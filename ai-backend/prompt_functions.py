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
    
    prompt = f"""진행도 분석을 단계별로 수행합니다. 현재는 **1단계: 프로젝트 분석**입니다.

## 프로젝트 정보:
- 프로젝트 설명: {projectDescription[:200] if projectDescription else '없음'}
- 프로젝트 시작일: {projectStartDate or '미정'}
- 프로젝트 마감일: {projectDueDate or '미정'}
- 총 커밋 수: {len(commits)}개
- 총 Task 수: {len(tasks)}개
{files_section}

## 1단계 작업: 프로젝트 분석
읽은 파일(README, 설정 파일 등)과 프로젝트 설명을 바탕으로 다음을 작성하세요:

다음 JSON 형식으로만 응답하세요:
{{
  "step": 1,
  "projectName": "실제 프로젝트 이름 (README나 package.json에서 확인한 실제 이름, [프로젝트의 실제 이름] 같은 형식이 아닌 실제 값)",
  "projectDescription": "실제 프로젝트 설명 (이 프로젝트는 어떤 프로젝트인지, 목적, 기술 스택, 주요 특징을 3-5문장으로 설명. [이 프로젝트는...] 같은 형식이 아닌 실제 설명)",
  "nextStep": "다음 단계(2단계)에서는 이 프로젝트에 필요한 기능들을 분석하겠습니다."
}}

⚠️ **중요**: 
- 읽은 파일 내용을 바탕으로 프로젝트가 무엇인지 정확히 파악하세요.
- 프로젝트 이름은 README나 package.json에서 확인하세요.
- 프로젝트 설명은 구체적이고 명확하게 작성하세요."""
    
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
        # 2단계: 기능 분석 (필요한 기능들 파악)
        prompt = f"""진행도 분석 **2단계: 기능 분석**입니다.

## 이전 단계(1단계) 결과:
{json.dumps(step1_result, ensure_ascii=False, indent=2)}

{files_section}

## 2단계 작업: 필요한 기능 분석
이전 단계에서 파악한 프로젝트 정보를 바탕으로, 이 프로젝트에 있어야 할 주요 기능을 **포괄적으로** 나열하세요.

**기능 분류:**
- **페이지**: 각 페이지 경로 (예: 로그인 페이지, 프로젝트 목록 페이지 등)
- **API**: 포괄적인 API 그룹 (예: 사용자 인증 API, 프로젝트 관리 API, Task 관리 API 등)
- **기타**: 기타 주요 기능 (예: 데이터베이스 연결, 파일 업로드 등)

다음 JSON 형식으로만 응답하세요:
{{
  "step": 2,
  "requiredFeatures": [
    {{
      "name": "기능명 (예: 로그인 페이지, 사용자 인증 API, 프로젝트 관리 API 등)",
      "type": "page|api|other",
      "description": "간단한 설명 (1-2문장)",
      "expectedLocation": "예상 위치 (페이지: 경로, API: 엔드포인트 그룹)"
    }}
  ],
  "nextStep": "다음 단계(3단계)에서는 소스코드를 확인하여 실제로 구현된 기능을 찾겠습니다."
}}

⚠️ **중요**: 
- 기능을 **포괄적으로** 나열하세요 (세부 기능이 아닌 주요 기능 그룹).
- 페이지는 경로만, API는 엔드포인트 그룹으로 나열하세요.
- 최소 8개 이상의 기능을 나열하세요."""
    
    elif step_number == 3:
        # 3단계: 정보 추출 (소스코드에서 구현된 기능 확인)
        required_features = step2_result.get('requiredFeatures', [])
        required_features_text = "\n".join([f"- {f.get('name', '')} ({f.get('type', 'unknown')})" for f in required_features[:15]])
        
        prompt = f"""진행도 분석 **3단계: 구현된 기능 확인**입니다.

## 이전 단계 결과:

### 1단계: 프로젝트 분석
프로젝트 이름: {step1_result.get('projectName', 'N/A')}

### 2단계: 필요한 기능 분석
필요한 기능 목록:
{required_features_text}

{files_section}

## 3단계 작업: 구현된 기능 확인
위에서 읽은 파일 내용을 **반드시 활용하여** 실제 소스코드에서 확인된 기능을 찾으세요.

**표시 형식:**
- **페이지**: `페이지명 /경로/경로/.jsx` (예: 로그인 페이지 /src/pages/Login.jsx)
- **API**: `API 그룹명 /포괄적 엔드포인트, 나열` (예: 사용자 인증 API /api/user/login, /api/user/logout, /api/user/register)
- **기타**: `기능명 /위치` (예: 데이터베이스 연결 /database/db.js)

읽은 파일에서 실제로 확인된 것만 나열하세요. 추측하지 마세요.

다음 JSON 형식으로만 응답하세요:
{{
  "step": 3,
  "implementedFeatures": [
    {{
      "name": "기능명",
      "type": "page|api|other",
      "location": "페이지: /경로/경로/.jsx 또는 API: /엔드포인트, /엔드포인트 나열",
      "filePath": "주요 파일 경로 (1-2개)"
    }}
  ],
  "nextStep": "다음 단계(4단계)에서는 미구현 기능을 분석하겠습니다."
}}

⚠️ **중요**: 
- 읽은 파일 내용을 무시하지 말고, 실제로 파일에서 확인된 기능만 나열하세요.
- 페이지는 경로만, API는 엔드포인트를 포괄적으로 나열하세요.
- 세부 설명은 생략하고 위치만 명시하세요."""
    
    elif step_number == 4:
        # 4단계: 미구현 기능 분석
        required_features = step2_result.get('requiredFeatures', [])
        implemented_features = step3_result.get('implementedFeatures', [])
        
        implemented_names = [f.get('name', '') for f in implemented_features]
        
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
{json.dumps(implemented_features, ensure_ascii=False, indent=2)[:1000]}

{files_section}

## 4단계 작업: 미구현 기능 분석
필요한 기능 목록과 구현된 기능 목록을 비교하여, 아직 구현되지 않은 기능을 찾으세요.

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

⚠️ **중요**: 
- 필요한 기능 중 구현된 기능에 없는 것만 나열하세요.
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

## 이전 단계 결과:

### 1단계: 프로젝트 분석
프로젝트 이름: {project_name}
프로젝트 설명: {project_desc[:200]}...

### 2단계: 필요한 기능 분석
필요한 기능 수: {total_required}개

### 3단계: 구현된 기능 확인
구현된 기능 수: {total_implemented}개

### 4단계: 미구현 기능 분석
미구현 기능 수: {total_missing}개

## 5단계 작업: 평가 및 진행도 계산
위 분석 결과를 바탕으로 최종 평가를 작성하세요.

**중요 체크사항:**
- 구현된 API가 필요한 모든 API를 포함하는지 확인하세요.
- 읽은 파일에서 확인된 API 엔드포인트가 필요한 기능 목록과 일치하는지 검증하세요.
- 누락된 API가 있는지 확인하세요.

다음 JSON 형식으로만 응답하세요:
{{
  "step": 5,
  "currentProgress": {progress},
  "narrativeResponse": "## 프로젝트 이름\\n{project_name}\\n\\n### 프로젝트 설명\\n{project_desc}\\n\\n### 구현된 기능\\n{chr(10).join(implemented_list) if implemented_list else '없음'}\\n\\n### 미구현 기능\\n{chr(10).join(missing_list) if missing_list else '없음'}\\n\\n### 평가\\n**진행도**: {progress}%\\n\\n**예상 완성일**: [현재 진행 속도를 고려한 예상 완성일 또는 '미정']\\n\\n**총평**: [프로젝트의 현재 상태를 2-3줄로 요약한 총평. 핵심 기능 구현 상태, 주요 미구현 기능, 전체적인 프로젝트 상태를 간결하게 설명]",
  "activityTrend": "increasing|stable|decreasing",
  "delayRisk": "Low|Medium|High",
  "estimatedCompletionDate": "YYYY-MM-DD 또는 null",
  "insights": ["인사이트 1", "인사이트 2", "인사이트 3"],
  "recommendations": ["제안 1", "제안 2", "제안 3"]
}}

⚠️ **매우 중요**: 
- narrativeResponse는 위에서 지정한 정확한 형식으로 작성하세요.
- currentProgress는 반드시 {progress}와 일치해야 합니다 (계산: {total_implemented}/{total_required}×100).
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

