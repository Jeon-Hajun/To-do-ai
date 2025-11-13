"""
프롬프트 최적화 유틸리티
프롬프트 길이를 줄이고 핵심 정보만 추출하여 리소스 소모를 감소시킵니다.
"""

def summarize_commit_message(msg, max_length=80):
    """커밋 메시지를 요약합니다."""
    if len(msg) <= max_length:
        return msg
    
    # 첫 줄만 사용 (일반적으로 커밋 메시지의 핵심)
    first_line = msg.split('\n')[0]
    if len(first_line) <= max_length:
        return first_line
    
    # 길면 잘라서 ... 추가
    return first_line[:max_length-3] + "..."

def extract_keywords_from_commits(commits, max_commits=15):
    """커밋에서 핵심 키워드만 추출합니다."""
    keywords = []
    for commit in commits[:max_commits]:
        msg = commit.get('message', '')
        # 첫 줄만 사용하고 요약
        summarized = summarize_commit_message(msg, 60)
        keywords.append(f"{summarized} ({commit.get('linesAdded', 0)}+/{commit.get('linesDeleted', 0)}-)")
    return keywords

def summarize_file_paths(files, max_files=3):
    """파일 경로를 요약합니다."""
    if not files:
        return ""
    
    # 디렉토리별로 그룹화
    dirs = {}
    for file_path in files[:10]:  # 최대 10개만 확인
        parts = file_path.split('/')
        if len(parts) > 1:
            dir_name = '/'.join(parts[:-1])
            dirs[dir_name] = dirs.get(dir_name, 0) + 1
        else:
            dirs['root'] = dirs.get('root', 0) + 1
    
    # 상위 디렉토리만 반환
    top_dirs = sorted(dirs.items(), key=lambda x: x[1], reverse=True)[:max_files]
    return ', '.join([f"{d}({c}파일)" for d, c in top_dirs])

def create_optimized_task_suggestion_prompt(commits, issues, currentTasks, projectDescription, githubRepo):
    """최적화된 Task 제안 프롬프트 생성"""
    
    # 커밋 요약 (핵심만)
    commit_keywords = extract_keywords_from_commits(commits, max_commits=15)
    commit_summary = '\n'.join([f"- {kw}" for kw in commit_keywords])
    
    # 통계 계산
    totalLinesAdded = sum(c.get('linesAdded', 0) or 0 for c in commits[:30])
    totalLinesDeleted = sum(c.get('linesDeleted', 0) or 0 for c in commits[:30])
    
    # 파일 유형 통계
    fileTypes = {}
    for commit in commits[:30]:
        for file in commit.get('files', [])[:5]:
            ext = file.get('path', '').split('.')[-1] if '.' in file.get('path', '') else 'unknown'
            fileTypes[ext] = fileTypes.get(ext, 0) + 1
    topFileTypes = ', '.join([f"{ext}({count})" for ext, count in sorted(fileTypes.items(), key=lambda x: x[1], reverse=True)[:5]]) if fileTypes else "없음"
    
    # 이슈 요약
    openIssues = [i for i in issues if i.get('state') == 'open']
    issue_summary = f"{len(openIssues)}개 열림" if openIssues else "없음"
    
    # Task 요약
    task_summary = f"총 {len(currentTasks)}개 (todo: {sum(1 for t in currentTasks if t.get('status') == 'todo')}, 진행중: {sum(1 for t in currentTasks if t.get('status') == 'in_progress')}, 완료: {sum(1 for t in currentTasks if t.get('status') == 'done')})"
    
    prompt = f"""프로젝트 분석 및 Task 제안:

프로젝트: {projectDescription[:100]}
커밋: {len(commits)}개, +{totalLinesAdded}/-{totalLinesDeleted}줄, 주요파일: {topFileTypes}
이슈: {issue_summary}
작업: {task_summary}

최근 커밋:
{commit_summary}

다음 형식의 JSON 배열로 최대 5개 Task 제안:
[{{"title": "...", "description": "...", "category": "feature|refactor|security|performance|maintenance", "priority": "High|Medium|Low", "estimatedHours": 숫자, "reason": "..."}}]

규칙: 실제 필요한 작업만, High는 보안/심각한 기술부채만, 반드시 한국어로 응답, JSON만 응답."""
    
    return prompt

def create_optimized_progress_prompt(commits, tasks, projectDescription, projectStartDate, projectDueDate):
    """최적화된 진행도 분석 프롬프트 생성"""
    
    # Task 통계
    taskStats = {
        'total': len(tasks),
        'todo': sum(1 for t in tasks if t.get('status') == 'todo'),
        'inProgress': sum(1 for t in tasks if t.get('status') == 'in_progress'),
        'done': sum(1 for t in tasks if t.get('status') == 'done')
    }
    
    # 커밋 통계
    commitStats = {
        'total': len(commits),
        'totalLinesAdded': sum(c.get('linesAdded', 0) or 0 for c in commits),
        'totalLinesDeleted': sum(c.get('linesDeleted', 0) or 0 for c in commits),
    }
    
    # 최근 활동 (간단히)
    from datetime import datetime, timedelta
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    recent_week = sum(1 for c in commits if c.get('date') and 
                     datetime.fromisoformat(c.get('date').replace('Z', '+00:00')) >= week_ago)
    
    prompt = f"""진행도 분석:

프로젝트: {projectDescription[:80]}
작업: 총{taskStats['total']}개 (완료:{taskStats['done']}, 진행중:{taskStats['inProgress']}, 대기:{taskStats['todo']})
커밋: 총{commitStats['total']}개, +{commitStats['totalLinesAdded']}/-{commitStats['totalLinesDeleted']}줄, 최근7일:{recent_week}개

다음 JSON 형식으로 응답 (반드시 한국어로):
{{"currentProgress": 0-100, "activityTrend": "increasing|stable|decreasing", "estimatedCompletionDate": "YYYY-MM-DD 또는 null", "delayRisk": "Low|Medium|High", "insights": ["..."], "recommendations": ["..."]}}"""
    
    return prompt

def create_optimized_completion_prompt(task, commits, projectDescription):
    """최적화된 Task 완료 확인 프롬프트 생성"""
    
    # 커밋 요약
    commit_summary = []
    for commit in commits[:10]:  # 최대 10개만
        msg = summarize_commit_message(commit.get('message', ''), 50)
        commit_summary.append(f"{msg} (+{commit.get('linesAdded', 0)}/-{commit.get('linesDeleted', 0)})")
    
    commits_text = '\n'.join([f"- {c}" for c in commit_summary]) if commit_summary else "관련 커밋 없음"
    
    prompt = f"""Task 완료 여부 판단:

Task: {task.get('title', '')[:80]}
설명: {task.get('description', '')[:100] if task.get('description') else '없음'}
상태: {task.get('status', 'todo')}

관련 커밋:
{commits_text}

다음 JSON 형식으로 응답 (반드시 한국어로):
{{"isCompleted": true|false, "completionPercentage": 0-100, "confidence": "high|medium|low", "reason": "...", "evidence": ["..."], "recommendation": "..."}}"""
    
    return prompt

