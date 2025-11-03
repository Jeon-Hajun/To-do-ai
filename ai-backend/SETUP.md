# AI 백엔드 설정 가이드

## 로컬 모델 (Ollama) 사용하기 (권장)

### 1. Ollama 설치

#### macOS/Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Windows
[Ollama 공식 웹사이트](https://ollama.com)에서 다운로드

### 2. Ollama 서버 실행

```bash
ollama serve
```

이 명령어는 백그라운드에서 계속 실행되어야 합니다.

### 3. 모델 다운로드 (새 터미널에서)

```bash
# Qwen2.5:14B 추천 (한국어 지원 우수, 품질/속도 균형)
ollama pull qwen2.5:14b

# 더 높은 품질이 필요한 경우 (RTX 5090 32GB에서 가능)
ollama pull qwen2.5:32b

# 또는 최고 품질 (양자화 버전)
ollama pull llama3.1:70b
```

### 4. 환경 변수 설정

`.env` 파일 생성:

```bash
cp env.example .env
```

`.env` 파일 수정:
```env
# Ollama 설정 (기본값)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:14b

# OpenAI 사용하지 않음
USE_OPENAI=false
```

### 5. AI 백엔드 실행

```bash
cd ai-backend
source venv/bin/activate  # 가상환경 활성화
python app.py
```

## OpenAI 사용하기 (선택사항)

클라우드 모델을 사용하려면:

```env
USE_OPENAI=true
OPENAI_API_KEY=your-api-key-here
```

## 서버 PC로 이동 시 체크리스트

1. ✅ Python 가상환경 설정
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Linux/Mac
   # 또는 venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

2. ✅ Ollama 설치 및 모델 다운로드
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama serve  # 백그라운드 실행
   ollama pull qwen2.5:14b
   ```

3. ✅ 환경 변수 설정
   ```bash
   cp env.example .env
   # .env 파일 편집
   ```

4. ✅ 서버 실행 확인
   ```bash
   python app.py
   # 또는
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

## 테스트

서버 실행 후:
```bash
curl http://localhost:5000/health
```

응답 예시:
```json
{
  "status": "OK",
  "mode": "Ollama",
  "model": "qwen2.5:14b"
}
```

## 문제 해결

### Ollama 연결 실패
- `ollama serve`가 실행 중인지 확인
- 포트 11434가 열려있는지 확인
- 방화벽 설정 확인

### 모델이 로드되지 않음
- 모델이 다운로드되었는지 확인: `ollama list`
- GPU 메모리 확인 (nvidia-smi)

### 응답이 느림
- 더 작은 모델 사용 (예: qwen2.5:7b)
- GPU 드라이버 업데이트
- Ollama 최신 버전 사용

