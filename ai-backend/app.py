from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime
import os
import json
import httpx

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Ollama 설정 (로컬 모델)
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen2.5:14b')

# OpenAI 설정 (클라우드 모델 사용 시, 선택사항)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', None)
USE_OPENAI = os.getenv('USE_OPENAI', 'false').lower() == 'true' and OPENAI_API_KEY is not None

if USE_OPENAI:
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("OpenAI 모드로 실행됩니다.")
    except ImportError:
        openai_client = None
        USE_OPENAI = False
        print("Warning: OpenAI library not installed. Ollama를 사용합니다.")
else:
    openai_client = None
    print(f"Ollama 모드로 실행됩니다. (모델: {OLLAMA_MODEL})")

def check_ollama_model():
    """Ollama 모델이 설치되어 있는지 확인"""
    try:
        response = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        response.raise_for_status()
        models = response.json().get("models", [])
        model_names = [m.get("name", "") for m in models]
        return OLLAMA_MODEL in model_names
    except Exception as e:
        print(f"Ollama 모델 확인 실패: {e}")
        return False

def call_ollama(prompt, system_prompt="당신은 도움이 되는 AI 어시스턴트입니다."):
    """Ollama API 호출"""
    try:
        # 모델 확인
        if not check_ollama_model():
            raise Exception(f"Ollama 모델 '{OLLAMA_MODEL}'이 설치되지 않았습니다. 다음 명령어로 설치하세요: ollama pull {OLLAMA_MODEL}")
        
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "stream": False
            },
            timeout=120.0
        )
        response.raise_for_status()
        return response.json()["message"]["content"]
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise Exception(f"Ollama 모델 '{OLLAMA_MODEL}'을 찾을 수 없습니다. 다음 명령어로 설치하세요: ollama pull {OLLAMA_MODEL}")
        raise Exception(f"Ollama API 오류 ({e.response.status_code}): {e.response.text}")
    except httpx.RequestError as e:
        raise Exception(f"Ollama 서버 연결 실패: {e}. Ollama가 실행 중인지 확인하세요. (ollama serve)")
    except Exception as e:
        print(f"Ollama API 호출 오류: {str(e)}")
        raise

def call_openai(prompt, system_prompt="당신은 도움이 되는 AI 어시스턴트입니다."):
    """OpenAI API 호출"""
    if not openai_client:
        raise Exception("OpenAI 클라이언트가 초기화되지 않았습니다.")
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API 호출 오류: {str(e)}")
        raise

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.now().isoformat(),
        'service': 'AI Backend',
        'mode': 'OpenAI' if USE_OPENAI else 'Ollama',
        'model': 'gpt-3.5-turbo' if USE_OPENAI else OLLAMA_MODEL
    })

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({
        'message': f'AI Backend is running ({'OpenAI' if USE_OPENAI else 'Ollama'} mode)',
        'model': 'gpt-3.5-turbo' if USE_OPENAI else OLLAMA_MODEL,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/ai/task-suggestion', methods=['POST'])
def task_suggestion():
    """
    코드 분석 기반 새로운 Task 제안 (코드 품질, 리팩토링, 보안 분석 포함)
    Request Body:
    {
        "commits": [...],  # 커밋 목록 (파일 변경 정보 포함)
        "issues": [...],  # 이슈 목록
        "currentTasks": [...],  # 현재 Task 목록
        "projectDescription": "...",
        "githubRepo": "..."
    }
    """
    try:
        data = request.json
        commits = data.get('commits', [])
        issues = data.get('issues', [])
        currentTasks = data.get('currentTasks', [])
        projectDescription = data.get('projectDescription', '')
        githubRepo = data.get('githubRepo', '')

        # 정보가 충분한지 확인
        hasCommits = len(commits) > 0
        hasIssues = len(issues) > 0
        hasTasks = len(currentTasks) > 0
        
        if not hasCommits and not hasIssues and not hasTasks:
            return jsonify({
                'suggestions': [],
                'warning': '분석할 정보가 부족합니다. GitHub 저장소를 연결하고 동기화해주세요.'
            })

        # 커밋 정보 정리 (최근 30개)
        recentCommits = commits[:30]
        commitAnalysis = []
        totalLinesAdded = 0
        totalLinesDeleted = 0
        fileChangePatterns = {}
        
        for commit in recentCommits:
            msg = commit.get('message', '')
            linesAdded = commit.get('linesAdded', 0) or 0
            linesDeleted = commit.get('linesDeleted', 0) or 0
            filesChanged = commit.get('filesChanged', 0) or 0
            files = commit.get('files', [])
            
            totalLinesAdded += linesAdded
            totalLinesDeleted += linesDeleted
            
            # 파일 변경 패턴 분석
            for file in files:
                filePath = file.get('path', '')
                if filePath:
                    ext = filePath.split('.')[-1] if '.' in filePath else 'unknown'
                    if ext not in fileChangePatterns:
                        fileChangePatterns[ext] = {'count': 0, 'additions': 0, 'deletions': 0}
                    fileChangePatterns[ext]['count'] += 1
                    fileChangePatterns[ext]['additions'] += file.get('additions', 0)
                    fileChangePatterns[ext]['deletions'] += file.get('deletions', 0)
            
            commitAnalysis.append({
                'message': msg[:150],
                'linesAdded': linesAdded,
                'linesDeleted': linesDeleted,
                'filesChanged': filesChanged,
                'files': [f.get('path', '') for f in files[:5]]  # 주요 파일만
            })

        # 이슈 정보 정리
        openIssues = [i for i in issues if i.get('state') == 'open']
        issueLabels = {}
        for issue in issues:
            labels = issue.get('labels', [])
            for label in labels:
                issueLabels[label] = issueLabels.get(label, 0) + 1

        # 현재 Task 정리
        taskTitles = [task.get('title', '') for task in currentTasks]
        taskStatuses = {}
        for task in currentTasks:
            status = task.get('status', 'todo')
            taskStatuses[status] = taskStatuses.get(status, 0) + 1

        # 프롬프트 생성
        prompt = f"""당신은 소프트웨어 엔지니어링 전문가입니다. 프로젝트의 코드 변경 이력, 이슈, 현재 작업을 종합적으로 분석하여 다음 관점에서 Task를 제안해주세요:

## 분석 관점
1. **기능 개발**: 누락된 기능이나 개선이 필요한 기능
2. **코드 품질**: 리팩토링이 필요한 영역 (복잡도, 중복 코드, 코드 냄새)
3. **보안**: 잠재적 보안 취약점이나 보안 강화 필요 영역
4. **성능**: 최적화가 필요한 부분
5. **유지보수성**: 기술 부채나 개선이 필요한 부분

## 프로젝트 정보
프로젝트: {projectDescription}
GitHub 저장소: {githubRepo if githubRepo else '연결되지 않음'}

## 코드 변경 통계
- 총 커밋 수: {len(recentCommits)}개
- 총 추가된 라인: {totalLinesAdded}줄
- 총 삭제된 라인: {totalLinesDeleted}줄
- 주요 변경 파일 유형: {', '.join(list(fileChangePatterns.keys())[:5]) if fileChangePatterns else '없음'}

## 최근 커밋 분석 (최근 {len(recentCommits)}개)
{chr(10).join([f"- [{c['linesAdded']}+/{c['linesDeleted']}-, {c['filesChanged']}파일] {c['message']}" + (f" (주요 파일: {', '.join(c['files'][:3])})" if c['files'] else "") for c in commitAnalysis[:20]])}

## 이슈 현황
- 열린 이슈: {len(openIssues)}개
- 주요 라벨: {', '.join(sorted(issueLabels.items(), key=lambda x: x[1], reverse=True)[:5]) if issueLabels else '없음'}
{f"- 최근 이슈: {chr(10).join([f'  - #{{i[\"number\"]}}: {{i[\"title\"]}}' for i in openIssues[:5]])}" if openIssues else ""}

## 현재 작업 현황
- 총 작업 수: {len(currentTasks)}개
- 작업 상태: {', '.join([f'{k}: {v}개' for k, v in taskStatuses.items()])}
- 현재 작업 목록:
{chr(10).join([f"  - {title}" for title in taskTitles[:10]])}

## 분석 지시사항
1. **코드 변경 패턴 분석**: 커밋 메시지와 파일 변경 패턴을 분석하여 개발 방향성 파악
2. **복잡도 분석**: 대량의 코드 변경이 있는 파일이나 반복적인 변경이 있는 영역 식별
3. **보안 이슈**: 커밋 메시지나 파일 경로에서 보안 관련 키워드나 패턴 발견
4. **기능 격차**: 현재 작업 목록과 커밋 이력을 비교하여 누락된 기능 식별
5. **기술 부채**: 리팩토링이 필요한 영역 (중복 코드, 복잡한 로직, 오래된 패턴 등)

## 제안 형식
다음 형식의 JSON 배열로 응답해주세요:
[
  {{
    "title": "작업 제목 (명확하고 구체적으로)",
    "description": "상세 설명 (왜 필요한지, 어떤 문제를 해결하는지)",
    "category": "feature|refactor|security|performance|maintenance",
    "priority": "High|Medium|Low",
    "estimatedHours": 숫자,
    "reason": "이 작업이 필요한 이유 (분석 근거)"
  }}
]

## 제안 규칙
- 최대 8개까지만 제안
- 실제로 필요한 작업만 제안 (추측하지 말 것)
- 각 카테고리별로 균형있게 제안
- 정보가 부족한 경우 해당 카테고리는 제안하지 않음
- High 우선순위는 보안 이슈나 심각한 기술 부채에만 부여
- 반드시 유효한 JSON 배열 형식으로만 응답 (설명 없이 JSON만)"""

        system_prompt = """당신은 경험이 풍부한 소프트웨어 엔지니어링 전문가입니다. 
코드 변경 이력, 이슈, 작업 목록을 종합적으로 분석하여 프로젝트의 개선점을 찾아냅니다.
코드 품질, 보안, 성능, 유지보수성 등 다양한 관점에서 실용적이고 구체적인 제안을 합니다.
응답은 반드시 유효한 JSON 배열 형식이어야 하며, 추가 설명 없이 JSON만 반환합니다."""

        # OpenAI 또는 Ollama 호출
        if USE_OPENAI:
            content = call_openai(prompt, system_prompt)
        else:
            content = call_ollama(prompt, system_prompt)
        
        # JSON 파싱 시도
        try:
            # 코드 블록이 있는 경우 제거
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            suggestions = json.loads(content)
            
            if not isinstance(suggestions, list):
                suggestions = [suggestions]
            
            # 카테고리별로 정렬 (security > refactor > feature > performance > maintenance)
            category_order = {'security': 0, 'refactor': 1, 'feature': 2, 'performance': 3, 'maintenance': 4}
            suggestions.sort(key=lambda x: (
                category_order.get(x.get('category', 'maintenance'), 99),
                {'High': 0, 'Medium': 1, 'Low': 2}.get(x.get('priority', 'Low'), 2)
            ))
                
            return jsonify({
                'suggestions': suggestions,
                'analysis': {
                    'totalCommits': len(commits),
                    'totalIssues': len(issues),
                    'totalTasks': len(currentTasks),
                    'hasEnoughData': hasCommits or hasIssues
                }
            })
        except json.JSONDecodeError as e:
            # JSON 파싱 실패 시 텍스트 기반으로 간단한 응답 반환
            print(f"JSON 파싱 실패: {e}")
            print(f"응답 내용: {content[:500]}")
            return jsonify({
                'suggestions': [
                    {
                        'title': 'AI 제안 확인 필요',
                        'description': content[:200],
                        'category': 'maintenance',
                        'priority': 'Medium',
                        'estimatedHours': 0,
                        'reason': 'JSON 파싱 실패로 인한 텍스트 응답'
                    }
                ],
                'warning': 'JSON 파싱 실패, 텍스트 응답 사용',
                'analysis': {
                    'totalCommits': len(commits),
                    'totalIssues': len(issues),
                    'totalTasks': len(currentTasks),
                    'hasEnoughData': hasCommits or hasIssues
                }
            })

    except Exception as e:
        print(f"Task 제안 오류: {str(e)}")
        return jsonify({
            'error': f'작업 제안 생성 실패: {str(e)}'
        }), 500

@app.route('/api/ai/progress-analysis', methods=['POST'])
def progress_analysis():
    """
    AI 기반 프로젝트 진행도 분석 및 예측
    Request Body:
    {
        "commits": [...],  # 커밋 목록
        "tasks": [...],  # Task 목록
        "projectDescription": "...",
        "projectStartDate": "...",  # 선택사항
        "projectDueDate": "..."  # 선택사항
    }
    """
    try:
        data = request.json
        commits = data.get('commits', [])
        tasks = data.get('tasks', [])
        projectDescription = data.get('projectDescription', '')
        projectStartDate = data.get('projectStartDate', None)
        projectDueDate = data.get('projectDueDate', None)

        # 데이터가 없어도 기본 분석 제공
        if not commits and not tasks:
            return jsonify({
                'currentProgress': 0,
                'activityTrend': 'stable',
                'estimatedCompletionDate': None,
                'delayRisk': 'Low',
                'insights': [
                    '프로젝트가 시작 단계입니다. 커밋이나 작업 데이터가 없어 정확한 분석이 어렵습니다.',
                    'GitHub 저장소를 연결하고 작업을 추가하면 더 정확한 분석을 받을 수 있습니다.'
                ],
                'recommendations': [
                    'GitHub 저장소를 연결하여 커밋 이력을 동기화하세요.',
                    '프로젝트 작업(Task)을 추가하여 진행 상황을 추적하세요.'
                ]
            })

        # Task 통계
        taskStats = {
            'total': len(tasks),
            'todo': len([t for t in tasks if t.get('status') == 'todo']),
            'inProgress': len([t for t in tasks if t.get('status') == 'in_progress']),
            'done': len([t for t in tasks if t.get('status') == 'done'])
        }
        
        # 커밋 통계
        commitStats = {
            'total': len(commits),
            'totalLinesAdded': sum(c.get('linesAdded', 0) or 0 for c in commits),
            'totalLinesDeleted': sum(c.get('linesDeleted', 0) or 0 for c in commits),
            'recentCommits': len([c for c in commits if c.get('date')])  # 날짜가 있는 커밋
        }

        # 최근 활동 분석 (최근 7일, 30일)
        from datetime import datetime, timedelta
        now = datetime.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        recent_week_commits = []
        recent_month_commits = []
        
        for commit in commits:
            commit_date = commit.get('date')
            if commit_date:
                try:
                    if isinstance(commit_date, str):
                        commit_dt = datetime.fromisoformat(commit_date.replace('Z', '+00:00'))
                    else:
                        commit_dt = commit_date
                    
                    if commit_dt >= week_ago:
                        recent_week_commits.append(commit)
                    if commit_dt >= month_ago:
                        recent_month_commits.append(commit)
                except:
                    pass

        prompt = f"""당신은 프로젝트 관리 전문가입니다. 다음 정보를 분석하여 프로젝트의 진행도를 평가하고 예측해주세요.

## 프로젝트 정보
프로젝트: {projectDescription}
프로젝트 시작일: {projectStartDate if projectStartDate else '알 수 없음'}
프로젝트 마감일: {projectDueDate if projectDueDate else '알 수 없음'}

## Task 현황
- 총 Task: {taskStats['total']}개
- 대기 중: {taskStats['todo']}개
- 진행 중: {taskStats['inProgress']}개
- 완료: {taskStats['done']}개
- Task 진행률: {round((taskStats['done'] / taskStats['total'] * 100) if taskStats['total'] > 0 else 0)}%

## 코드 활동 현황
- 총 커밋 수: {commitStats['total']}개
- 총 추가된 라인: {commitStats['totalLinesAdded']}줄
- 총 삭제된 라인: {commitStats['totalLinesDeleted']}줄
- 최근 7일 커밋: {len(recent_week_commits)}개
- 최근 30일 커밋: {len(recent_month_commits)}개

## 분석 요청사항
1. **현재 진행도 평가**: Task 진행률과 코드 활동을 종합하여 실제 진행도를 평가 (0-100%)
2. **활동 패턴 분석**: 최근 활동이 증가/감소 추세인지 분석
3. **완료 예측**: 현재 속도로 예상되는 완료 시기
4. **지연 위험도**: 마감일 대비 지연 가능성 평가 (Low/Medium/High)
5. **개선 제안**: 진행도를 높이기 위한 구체적인 제안

다음 형식의 JSON으로 응답해주세요:
{{
  "currentProgress": 숫자 (0-100),
  "activityTrend": "increasing|stable|decreasing",
  "estimatedCompletionDate": "YYYY-MM-DD 또는 null",
  "delayRisk": "Low|Medium|High",
  "insights": [
    "분석 인사이트 1",
    "분석 인사이트 2"
  ],
  "recommendations": [
    "개선 제안 1",
    "개선 제안 2"
  ]
}}

반드시 유효한 JSON 형식으로만 응답해주세요."""

        system_prompt = """당신은 경험이 풍부한 프로젝트 관리 전문가입니다.
Task 진행률, 코드 활동, 시간 경과를 종합적으로 분석하여 정확한 진행도 평가와 예측을 제공합니다.
응답은 반드시 유효한 JSON 형식이어야 하며, 추가 설명 없이 JSON만 반환합니다."""

        if USE_OPENAI:
            content = call_openai(prompt, system_prompt)
        else:
            content = call_ollama(prompt, system_prompt)
        
        try:
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            analysis = json.loads(content)
            return jsonify(analysis)
        except json.JSONDecodeError as e:
            print(f"JSON 파싱 실패: {e}")
            print(f"응답 내용: {content[:500]}")
            return jsonify({
                'error': '분석 결과 파싱 실패',
                'rawResponse': content[:200]
            }), 500

    except Exception as e:
        print(f"진행도 분석 오류: {str(e)}")
        return jsonify({
            'error': f'진행도 분석 실패: {str(e)}'
        }), 500

@app.route('/api/ai/task-completion-check', methods=['POST'])
def task_completion_check():
    """
    Task 완료 여부 판단 (커밋 메시지와 코드 변경사항 기반)
    Request Body:
    {
        "task": {{
            "id": 1,
            "title": "...",
            "description": "...",
            "status": "todo|in_progress|done"
        }},
        "commits": [...],  # 해당 Task와 관련된 커밋 목록
        "projectDescription": "..."
    }
    """
    try:
        data = request.json
        task = data.get('task', {})
        commits = data.get('commits', [])
        projectDescription = data.get('projectDescription', '')

        if not task:
            return jsonify({
                'error': 'Task 정보가 필요합니다.'
            }), 400

        taskTitle = task.get('title', '')
        taskDescription = task.get('description', '')
        currentStatus = task.get('status', 'todo')

        if not commits:
            return jsonify({
                'isCompleted': False,
                'confidence': 'low',
                'reason': '관련 커밋이 없습니다.',
                'recommendation': 'Task와 관련된 커밋이 없어 완료 여부를 판단할 수 없습니다.'
            })

        # 커밋 메시지와 파일 변경 정보 정리
        commitAnalysis = []
        for commit in commits[:20]:  # 최근 20개만
            msg = commit.get('message', '')
            files = commit.get('files', [])
            commitAnalysis.append({
                'message': msg[:200],
                'files': [f.get('path', '') for f in files[:5]],
                'linesAdded': commit.get('linesAdded', 0) or 0,
                'linesDeleted': commit.get('linesDeleted', 0) or 0
            })

        prompt = f"""당신은 코드 리뷰 전문가입니다. Task의 요구사항과 실제 코드 변경사항을 비교하여 Task 완료 여부를 판단해주세요.

## Task 정보
제목: {taskTitle}
설명: {taskDescription}
현재 상태: {currentStatus}

## 관련 커밋 및 코드 변경사항
{chr(10).join([f"- 커밋: {c['message']} (+{c['linesAdded']}/-{c['linesDeleted']} 라인)" + (f" (파일: {', '.join(c['files'][:3])})" if c['files'] else "") for c in commitAnalysis])}

## 판단 기준
1. **요구사항 매칭**: Task의 제목과 설명에 명시된 요구사항이 커밋 메시지나 파일 변경사항에서 구현되었는지 확인
2. **완성도 평가**: 부분적으로 완료되었는지, 완전히 완료되었는지 평가
3. **신뢰도**: 판단의 신뢰도 (high/medium/low)

## 응답 형식
다음 형식의 JSON으로 응답해주세요:
{{
  "isCompleted": true|false,
  "completionPercentage": 숫자 (0-100),
  "confidence": "high|medium|low",
  "reason": "판단 근거 (왜 완료되었거나 완료되지 않았는지)",
  "evidence": [
    "근거 1 (커밋 메시지나 파일 변경사항에서 발견된 증거)",
    "근거 2"
  ],
  "recommendation": "추가 작업이 필요한지, 또는 완료 처리해도 되는지에 대한 제안"
}}

반드시 유효한 JSON 형식으로만 응답해주세요."""

        system_prompt = """당신은 경험이 풍부한 코드 리뷰 전문가입니다.
Task 요구사항과 실제 코드 변경사항을 정확히 비교하여 완료 여부를 판단합니다.
응답은 반드시 유효한 JSON 형식이어야 하며, 추가 설명 없이 JSON만 반환합니다."""

        if USE_OPENAI:
            content = call_openai(prompt, system_prompt)
        else:
            content = call_ollama(prompt, system_prompt)
        
        try:
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            result = json.loads(content)
            return jsonify(result)
        except json.JSONDecodeError as e:
            print(f"JSON 파싱 실패: {e}")
            print(f"응답 내용: {content[:500]}")
            return jsonify({
                'isCompleted': False,
                'confidence': 'low',
                'reason': 'AI 응답 파싱 실패',
                'recommendation': '수동으로 확인이 필요합니다.'
            })

    except Exception as e:
        print(f"Task 완료 여부 판단 오류: {str(e)}")
        return jsonify({
            'error': f'Task 완료 여부 판단 실패: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.getenv('PORT', 5001)))
