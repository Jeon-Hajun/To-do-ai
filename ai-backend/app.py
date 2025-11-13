from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime
import os
import json
import httpx
from prompt_optimizer import (
    create_optimized_task_suggestion_prompt,
    create_optimized_progress_prompt,
    create_optimized_completion_prompt
)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Ollama 설정 (로컬 모델)
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
# 모델 옵션: qwen2.5:7b (빠름), qwen2.5:3b (매우 빠름), qwen2.5:14b (정확함)
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen2.5:14b')  # 기본값을 14b 모델로 변경

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
        
        print(f'[AI Backend] call_ollama - 프롬프트 길이: {len(prompt)} 문자, 시스템 프롬프트: {len(system_prompt)} 문자')
        print(f'[AI Backend] call_ollama - Ollama URL: {OLLAMA_BASE_URL}, 모델: {OLLAMA_MODEL}')
        
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
            timeout=300.0  # 5분으로 증가 (큰 모델의 경우 더 오래 걸릴 수 있음)
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
    print('[AI Backend] task_suggestion 요청 수신')
    try:
        data = request.json
        commits = data.get('commits', [])
        issues = data.get('issues', [])
        currentTasks = data.get('currentTasks', [])
        projectDescription = data.get('projectDescription', '')
        githubRepo = data.get('githubRepo', '')
        
        print(f'[AI Backend] task_suggestion - 데이터 수신: commits={len(commits)}, issues={len(issues)}, tasks={len(currentTasks)}')

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

        # 최적화된 프롬프트 사용
        prompt = create_optimized_task_suggestion_prompt(
            commits, issues, currentTasks, projectDescription, githubRepo
        )
        
        # 기존 프롬프트는 prompt_optimizer.py로 이동됨
        
        system_prompt = """소프트웨어 엔지니어링 전문가. 코드 분석 후 Task 제안. 반드시 한국어로 응답. JSON만 응답."""

        # OpenAI 또는 Ollama 호출
        print(f'[AI Backend] task_suggestion - LLM 호출 시작 (모드: {"OpenAI" if USE_OPENAI else "Ollama"})')
        if USE_OPENAI:
            content = call_openai(prompt, system_prompt)
        else:
            content = call_ollama(prompt, system_prompt)
        
        print(f'[AI Backend] task_suggestion - LLM 응답 수신 (길이: {len(content)} 문자)')
        
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
            
            print(f'[AI Backend] task_suggestion - 제안 생성 완료: {len(suggestions)}개')
                
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
            print(f"[AI Backend] task_suggestion - JSON 파싱 실패: {e}")
            print(f"[AI Backend] task_suggestion - 응답 내용 (처음 500자): {content[:500]}")
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
        print(f"[AI Backend] task_suggestion - 예외 발생: {str(e)}")
        import traceback
        print(f"[AI Backend] task_suggestion - 트레이스백:\n{traceback.format_exc()}")
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
    print('[AI Backend] progress_analysis 요청 수신')
    try:
        data = request.json
        commits = data.get('commits', [])
        tasks = data.get('tasks', [])
        projectDescription = data.get('projectDescription', '')
        projectStartDate = data.get('projectStartDate', None)
        projectDueDate = data.get('projectDueDate', None)
        
        print(f'[AI Backend] progress_analysis - 데이터 수신: commits={len(commits)}, tasks={len(tasks)}')

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

        # 최적화된 프롬프트 사용
        prompt = create_optimized_progress_prompt(
            commits, tasks, projectDescription, projectStartDate, projectDueDate
        )
        
        # 기존 프롬프트는 prompt_optimizer.py로 이동됨
        
        system_prompt = """프로젝트 관리 전문가. 진행도 분석 및 예측. 반드시 한국어로 응답. JSON만 응답."""

        print(f'[AI Backend] progress_analysis - LLM 호출 시작 (모드: {"OpenAI" if USE_OPENAI else "Ollama"})')
        if USE_OPENAI:
            content = call_openai(prompt, system_prompt)
        else:
            content = call_ollama(prompt, system_prompt)
        
        print(f'[AI Backend] progress_analysis - LLM 응답 수신 (길이: {len(content)} 문자)')
        
        try:
            # JSON 코드 블록 제거
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            # 앞뒤 공백 및 불필요한 텍스트 제거
            content = content.strip()
            # JSON 객체 시작 부분 찾기
            if '{' in content:
                content = content[content.find('{'):]
            # JSON 객체 끝 부분 찾기
            if '}' in content:
                content = content[:content.rfind('}')+1]
            
            print(f'[AI Backend] progress_analysis - 파싱할 내용 (처음 200자): {content[:200]}')
            analysis = json.loads(content)
            print(f'[AI Backend] progress_analysis - 분석 완료: {list(analysis.keys())}')
            return jsonify(analysis)
        except json.JSONDecodeError as e:
            print(f"[AI Backend] progress_analysis - JSON 파싱 실패: {e}")
            print(f"[AI Backend] progress_analysis - 응답 내용 (처음 500자): {content[:500]}")
            return jsonify({
                'error': '분석 결과 파싱 실패',
                'rawResponse': content[:200]
            }), 500

    except Exception as e:
        print(f"[AI Backend] progress_analysis - 예외 발생: {str(e)}")
        import traceback
        print(f"[AI Backend] progress_analysis - 트레이스백:\n{traceback.format_exc()}")
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
    print('[AI Backend] task_completion_check 요청 수신')
    try:
        data = request.json
        task = data.get('task', {})
        commits = data.get('commits', [])
        projectDescription = data.get('projectDescription', '')
        
        print(f'[AI Backend] task_completion_check - 데이터 수신: task={task.get("title", "N/A")}, commits={len(commits)}')

        if not task:
            return jsonify({
                'error': 'Task 정보가 필요합니다.'
            }), 400

        taskTitle = task.get('title', '')
        taskDescription = task.get('description', '')
        currentStatus = task.get('status', 'todo')
        
        # AI가 모든 커밋을 분석하여 관련성을 판단하도록 함
        # 단순 로직 판단 제거 - AI가 지능적으로 판단

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

        # 에이전트 방식: 프롬프트 체이닝
        from prompt_optimizer import create_initial_completion_prompt, create_followup_completion_prompt
        
        system_prompt = """당신은 코드 리뷰 전문가입니다. Task 완료 여부를 판단합니다.

중요 규칙:
1. 반드시 한국어로만 응답하세요. 중국어, 영어 등 다른 언어는 절대 사용하지 마세요.
2. JSON 형식으로만 응답하세요.
3. 사용자가 지정한 Task만 분석하세요. 다른 Task는 무시하세요."""

        # 1차 분석: 초기 평가 및 추가 탐색 필요성 판단
        print(f'[AI Backend] task_completion_check - 1차 분석 시작 (모드: {"OpenAI" if USE_OPENAI else "Ollama"})')
        initial_prompt = create_initial_completion_prompt(task, commits, projectDescription)
        
        if USE_OPENAI:
            initial_content = call_openai(initial_prompt, system_prompt)
        else:
            initial_content = call_ollama(initial_prompt, system_prompt)
        
        print(f'[AI Backend] task_completion_check - 1차 분석 응답 수신 (길이: {len(initial_content)} 문자)')
        
        # JSON 파싱
        try:
            if '```json' in initial_content:
                initial_content = initial_content.split('```json')[1].split('```')[0].strip()
            elif '```' in initial_content:
                initial_content = initial_content.split('```')[1].split('```')[0].strip()
            
            initial_result = json.loads(initial_content)
            print(f'[AI Backend] task_completion_check - 1차 분석 완료: needsMoreInfo={initial_result.get("needsMoreInfo", False)}')
            
            # 추가 정보가 필요한 경우 2차 분석 수행
            if initial_result.get("needsMoreInfo", False):
                print(f'[AI Backend] task_completion_check - 추가 탐색 필요: {initial_result.get("searchStrategy", "N/A")}')
                print(f'[AI Backend] task_completion_check - 예상 위치: {initial_result.get("expectedLocation", "N/A")}')
                
                # 2차 분석: 추가 탐색 후 최종 판단
                print(f'[AI Backend] task_completion_check - 2차 분석 시작')
                followup_prompt = create_followup_completion_prompt(task, initial_result, commits, projectDescription)
                
                if USE_OPENAI:
                    followup_content = call_openai(followup_prompt, system_prompt)
                else:
                    followup_content = call_ollama(followup_prompt, system_prompt)
                
                print(f'[AI Backend] task_completion_check - 2차 분석 응답 수신 (길이: {len(followup_content)} 문자)')
                
                # JSON 파싱 (강화된 전처리)
                if '```json' in followup_content:
                    followup_content = followup_content.split('```json')[1].split('```')[0].strip()
                elif '```' in followup_content:
                    followup_content = followup_content.split('```')[1].split('```')[0].strip()
                
                # 앞뒤 공백 제거
                followup_content = followup_content.strip()
                
                # JSON 객체 시작 부분 찾기
                if '{' in followup_content:
                    start_idx = followup_content.find('{')
                    followup_content = followup_content[start_idx:]
                
                # JSON 객체 끝 부분 찾기
                if '}' in followup_content:
                    last_brace_idx = followup_content.rfind('}')
                    followup_content = followup_content[:last_brace_idx+1]
                
                print(f'[AI Backend] task_completion_check - 2차 분석 파싱할 내용 (처음 200자): {followup_content[:200]}')
                final_result = json.loads(followup_content)
                
                # 1차 분석 결과와 통합
                final_result['initialAnalysis'] = {
                    'expectedLocation': initial_result.get('expectedLocation'),
                    'searchStrategy': initial_result.get('searchStrategy'),
                    'currentAnalysis': initial_result.get('currentAnalysis')
                }
                final_result['analysisSteps'] = 2
                
                print(f'[AI Backend] task_completion_check - 최종 분석 완료: isCompleted={final_result.get("isCompleted", "N/A")}, confidence={final_result.get("confidence", "N/A")}')
                return jsonify(final_result)
            else:
                # 충분한 정보가 있으면 1차 결과 반환
                initial_result['analysisSteps'] = 1
                print(f'[AI Backend] task_completion_check - 1차 분석으로 충분: isCompleted={initial_result.get("isCompleted", "N/A")}')
                return jsonify(initial_result)
                
        except json.JSONDecodeError as e:
            print(f"[AI Backend] task_completion_check - JSON 파싱 실패: {e}")
            print(f"[AI Backend] task_completion_check - 응답 내용 (전체): {initial_content}")
            
            # 재시도: 더 공격적인 전처리
            try:
                # JSON 부분만 추출 시도
                import re
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', initial_content, re.DOTALL)
                if json_match:
                    cleaned_content = json_match.group(0)
                    print(f"[AI Backend] task_completion_check - 정규식으로 JSON 추출 시도")
                    initial_result = json.loads(cleaned_content)
                    initial_result['analysisSteps'] = 1
                    print(f"[AI Backend] task_completion_check - 재시도 성공")
                    return jsonify(initial_result)
            except:
                pass
            
            return jsonify({
                'isCompleted': False,
                'confidence': 'low',
                'reason': f'AI 응답 파싱 실패: {str(e)}',
                'recommendation': '수동으로 확인이 필요합니다.',
                'rawResponse': initial_content[:500] if len(initial_content) > 500 else initial_content
            })

    except Exception as e:
        print(f"[AI Backend] task_completion_check - 예외 발생: {str(e)}")
        import traceback
        print(f"[AI Backend] task_completion_check - 트레이스백:\n{traceback.format_exc()}")
        return jsonify({
            'error': f'Task 완료 여부 판단 실패: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.getenv('PORT', 5001)))
