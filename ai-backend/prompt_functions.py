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

def create_progress_analysis_initial_prompt(context, user_message, read_files, analyzed_commits):
    """진행도 분석 에이전트 초기 프롬프트"""
    commits = context.get('commits', [])
    tasks = context.get('tasks', [])
    projectDescription = context.get('projectDescription', '')
    projectStartDate = context.get('projectStartDate', None)
    projectDueDate = context.get('projectDueDate', None)
    
    # 읽은 파일 내용을 프롬프트에 포함
    base_prompt = create_optimized_progress_prompt(
        commits, tasks, projectDescription, projectStartDate, projectDueDate
    )
    
    # 읽은 파일 내용 추가
    if read_files:
        files_section = "\n\n## 📄 읽은 파일 내용 (반드시 이 내용을 활용하여 분석하세요):\n\n"
        for file_info in read_files:
            file_path = file_info.get('path', '')
            file_content = file_info.get('content', '')
            if file_content:
                # 파일 내용이 너무 길면 일부만 표시
                content_preview = file_content[:2000] if len(file_content) > 2000 else file_content
                files_section += f"### 파일: {file_path}\n```\n{content_preview}\n```\n\n"
        
        base_prompt += files_section
        base_prompt += "\n⚠️ **중요**: 위에서 읽은 파일 내용을 반드시 활용하여 프로젝트가 무엇인지, 어떤 기능들이 필요한지, 어떤 것이 구현되어 있는지 분석하세요.\n"
    
    return base_prompt

def create_progress_analysis_followup_prompt(context, previous_result, user_message, read_files, analyzed_commits):
    """진행도 분석 에이전트 후속 프롬프트"""
    commits = context.get('commits', [])
    tasks = context.get('tasks', [])
    
    # 읽은 파일 내용 상세 표시 (최근 10개)
    files_section = ""
    if read_files:
        files_section = "\n\n## 📄 새로 읽은 파일 내용 (반드시 이 내용을 활용하여 분석하세요):\n\n"
        for f in read_files[-10:]:  # 최근 10개 파일
            path = f.get('path', '')
            content = f.get('content', '')
            if content:
                # 파일 내용이 너무 길면 일부만 표시
                content_preview = content[:1500] if len(content) > 1500 else content
                files_section += f"### 파일: {path}\n```\n{content_preview}\n```\n\n"
    
    prompt = f"""이전 분석 결과를 바탕으로 더 정확하고 상세한 진행도 분석을 수행하세요.

## 이전 분석 결과:
{json.dumps(previous_result, ensure_ascii=False, indent=2)[:1500]}

## 추가 데이터:
- 전체 커밋: {len(commits)}개
- 전체 Task: {len(tasks)}개
{files_section}

## 추가 분석 요청:
위에서 읽은 파일 내용을 **반드시 활용하여** 다음을 구체적으로 분석하세요:

1. **소스코드 구조 분석**: 읽은 파일들을 바탕으로 어떤 모듈/컴포넌트/기능이 구현되어 있는지 구체적으로 나열
   - 파일명과 함수명/클래스명을 명시하여 "어떤 파일의 어떤 함수가 어떤 기능을 구현하는지" 설명

2. **완성도 평가**: 각 기능/모듈의 완성도를 평가
   - ✅ 완성됨: 전체 기능이 구현되어 작동 가능
   - ⚠️ 부분완성: 일부만 구현되었거나 불완전함
   - ❌ 미완성: 아직 구현되지 않음

3. **누락된 기능 확인**: 프로젝트에 필요한 기능 중 소스코드에서 확인되지 않은 기능 나열

4. **진행도 재계산**: 
   - 필요한 요소 수: [N]개
   - 개발된 요소 수: [M]개 (읽은 파일에서 확인된 것만)
   - 진행도: [M/N * 100]%

⚠️ **중요**: 
- 읽은 파일 내용을 무시하지 말고 반드시 활용하세요.
- 파일명, 함수명, 클래스명을 구체적으로 언급하세요.
- **narrativeResponse** 필드에는 위에서 지정한 정확한 형식(1. 근거 → 2. 필요한 요소들 → 3. 개발된 부분 → 4. 개발되지 않은 부분 → 5. 진행도 계산 → 6. 종합 평가)으로 작성하세요.
- 최소 1500자 이상의 상세한 설명을 작성하세요.

위 정보를 종합하여 더 정확하고 상세한 진행도 분석을 수행하세요. JSON 형식으로만 응답하세요."""
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

