# AI Backend

소스코드 분석 기반 PM 업무 자동화 플랫폼의 AI 백엔드 서버입니다.

## 기능

- GitHub 커밋 및 Task 분석 기반 새로운 Task 제안
- 로컬 모델 (Ollama) 또는 클라우드 모델 (OpenAI) 지원

## 빠른 시작

### 1. 의존성 설치

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### 2. Ollama 설정 (로컬 모델)

```bash
# Ollama 설치
curl -fsSL https://ollama.com/install.sh | sh

# Ollama 서버 실행
ollama serve

# 모델 다운로드 (새 터미널)
ollama pull qwen2.5:14b
```

### 3. 환경 변수 설정

```bash
cp env.example .env
# .env 파일을 편집하여 설정 확인
```

### 4. 서버 실행

```bash
source venv/bin/activate
python app.py
```

서버는 `http://localhost:5000`에서 실행됩니다.

## 테스트

```bash
# Ollama 연결 테스트
python test_ollama.py

# 서버 헬스 체크
curl http://localhost:5000/health
```

## 상세 설정

자세한 설정 방법은 [SETUP.md](./SETUP.md)를 참조하세요.

