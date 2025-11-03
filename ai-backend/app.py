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

def call_ollama(prompt, system_prompt="당신은 도움이 되는 AI 어시스턴트입니다."):
    """Ollama API 호출"""
    try:
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
    코드 분석 기반 새로운 Task 제안
    Request Body:
    {
        "commits": [...],  # 커밋 목록
        "currentTasks": [...],  # 현재 Task 목록
        "projectDescription": "..."
    }
    """
    try:
        data = request.json
        commits = data.get('commits', [])
        currentTasks = data.get('currentTasks', [])
        projectDescription = data.get('projectDescription', '')

        # 커밋 메시지와 현재 Task 목록을 기반으로 프롬프트 생성
        commitMessages = [commit.get('message', '')[:100] for commit in commits[:20]]  # 최근 20개만
        taskTitles = [task.get('title', '') for task in currentTasks]

        prompt = f"""다음은 프로젝트의 정보입니다:

프로젝트 설명: {projectDescription}

최근 커밋 메시지:
{chr(10).join(['- ' + msg for msg in commitMessages])}

현재 작업 목록:
{chr(10).join(['- ' + title for title in taskTitles])}

위 정보를 분석하여, 누락되었거나 추가로 필요할 수 있는 작업(Task)을 제안해주세요.
각 제안은 다음 형식의 JSON 배열로 응답해주세요:
[
  {{
    "title": "작업 제목",
    "description": "작업 설명",
    "priority": "High|Medium|Low",
    "estimatedHours": 숫자
  }}
]

제안은 최대 5개까지만 하고, 실제로 필요한 작업만 제안해주세요.
반드시 유효한 JSON 배열 형식으로만 응답해주세요."""

        system_prompt = "당신은 프로젝트 관리 전문가입니다. 코드 커밋과 현재 작업 목록을 분석하여 누락된 작업을 제안합니다. 응답은 반드시 유효한 JSON 배열 형식이어야 합니다."

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
                
            return jsonify({
                'suggestions': suggestions
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
                        'priority': 'Medium',
                        'estimatedHours': 0
                    }
                ],
                'warning': 'JSON 파싱 실패, 텍스트 응답 사용'
            })

    except Exception as e:
        print(f"Task 제안 오류: {str(e)}")
        return jsonify({
            'error': f'작업 제안 생성 실패: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
