#!/usr/bin/env python3
"""
Ollama 연결 테스트 스크립트
"""
import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen2.5:14b')

def test_ollama_connection():
    """Ollama 연결 및 모델 테스트"""
    print(f"Ollama 서버 연결 테스트: {OLLAMA_BASE_URL}")
    print(f"사용 모델: {OLLAMA_MODEL}")
    print("-" * 50)
    
    try:
        # 1. Ollama 서버 연결 확인
        print("1. Ollama 서버 연결 확인 중...")
        response = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        response.raise_for_status()
        models = response.json().get("models", [])
        print(f"   ✅ Ollama 서버 연결 성공")
        print(f"   사용 가능한 모델: {[m['name'] for m in models]}")
        
        # 2. 지정된 모델 확인
        print(f"\n2. 모델 '{OLLAMA_MODEL}' 확인 중...")
        model_names = [m['name'] for m in models]
        if OLLAMA_MODEL not in model_names:
            print(f"   ⚠️  모델 '{OLLAMA_MODEL}'이 설치되지 않았습니다.")
            print(f"   다음 명령어로 설치하세요: ollama pull {OLLAMA_MODEL}")
            return False
        print(f"   ✅ 모델 '{OLLAMA_MODEL}' 설치 확인")
        
        # 3. 간단한 테스트 질의
        print(f"\n3. 모델 응답 테스트 중...")
        test_prompt = "안녕하세요. 한국어로 간단히 인사해주세요."
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "user", "content": test_prompt}
                ],
                "stream": False
            },
            timeout=30.0
        )
        response.raise_for_status()
        result = response.json()
        print(f"   ✅ 모델 응답 성공")
        print(f"   응답: {result['message']['content'][:100]}...")
        
        print("\n" + "=" * 50)
        print("✅ 모든 테스트 통과! AI 백엔드를 실행할 준비가 되었습니다.")
        return True
        
    except httpx.ConnectError:
        print("   ❌ Ollama 서버에 연결할 수 없습니다.")
        print("   다음을 확인하세요:")
        print("   1. 'ollama serve' 명령어가 실행 중인지 확인")
        print("   2. 포트 11434가 열려있는지 확인")
        return False
    except httpx.HTTPStatusError as e:
        print(f"   ❌ HTTP 오류: {e.response.status_code}")
        return False
    except Exception as e:
        print(f"   ❌ 오류 발생: {str(e)}")
        return False

if __name__ == '__main__':
    success = test_ollama_connection()
    sys.exit(0 if success else 1)

