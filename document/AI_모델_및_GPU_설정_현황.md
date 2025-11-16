# AI 모델 및 GPU 설정 현황

## 현재 상태

### 1. 모델 설정
- **코드 설정**: 모든 AI 기능이 `qwen2.5:7b` 모델 사용하도록 설정됨
  - `ai-backend/app.py`: 기본값 `qwen2.5:7b`
  - `.env` 파일: `OLLAMA_MODEL=qwen2.5:7b`
  
- **실제 설치 상태**: 
  - `qwen2.5:14b`: 설치 완료 ✅
  - `qwen2.5:7b`: 설치 중 (약 22% 완료, 약 5분 남음) ⏳

- **현재 사용 중인 모델**: 
  - 모델이 설치되지 않으면 자동으로 14b를 사용하거나 에러 발생
  - 7b 설치 완료 후 재시작하면 7b 사용

### 2. GPU 설정
- **GPU 상태**: 없음 ❌
  - `nvidia-smi`: "No devices were found"
  - CPU로 실행 중

- **Ollama GPU 사용 설정**: 확인 필요
  - Ollama는 기본적으로 GPU를 자동 감지하여 사용
  - GPU가 없으면 자동으로 CPU 사용

## AI 기능별 모델 사용

모든 AI 기능은 **동일한 모델**을 사용합니다:
- `OLLAMA_MODEL` 환경변수 하나로 제어
- Task 제안, 진행도 분석, Task 완료 확인 모두 같은 모델 사용

```python
# ai-backend/app.py
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen2.5:7b')
```

## GPU 사용 설정 방법

### GPU가 있는 경우

1. **NVIDIA GPU 확인**
```bash
nvidia-smi
```

2. **CUDA 설치 확인**
```bash
nvcc --version
```

3. **Ollama GPU 자동 감지**
- Ollama는 GPU를 자동으로 감지하여 사용
- 별도 설정 불필요

4. **GPU 사용 강제 (선택사항)**
```bash
# 환경변수로 GPU 지정
export CUDA_VISIBLE_DEVICES=0
```

### GPU가 없는 경우 (현재 상태)

- CPU로 자동 실행됨
- 성능은 느리지만 작동함
- 더 작은 모델(7b) 사용으로 성능 개선 가능

## 모델별 성능 비교

| 모델 | 크기 | CPU 속도 | GPU 속도 | 정확도 |
|------|------|----------|----------|--------|
| qwen2.5:3b | ~2GB | 빠름 | 매우 빠름 | 보통 |
| qwen2.5:7b | ~4.5GB | 중간 | 빠름 | 좋음 |
| qwen2.5:14b | ~9GB | 느림 | 중간 | 매우 좋음 |

## 권장 설정

### CPU 환경 (현재)
- **모델**: `qwen2.5:7b` 또는 `qwen2.5:3b`
- **이유**: 빠른 응답 시간, 적은 메모리 사용

### GPU 환경
- **모델**: `qwen2.5:7b` (균형) 또는 `qwen2.5:14b` (정확도 우선)
- **이유**: GPU 가속으로 큰 모델도 빠르게 실행 가능

## 다음 단계

1. **qwen2.5:7b 모델 설치 완료 대기** (약 5분)
2. **AI 백엔드 재시작** (모델 설치 완료 후)
3. **성능 테스트** (7b 모델로 테스트)

## 모델 설치 확인 및 재시작

```bash
# 모델 설치 확인
curl http://localhost:11434/api/tags | grep qwen2.5:7b

# AI 백엔드 재시작
cd /home/webdev/AutoPM/To-do-ai/ai-backend
pkill -f 'python.*app.py'
source venv/bin/activate
nohup python app.py > ai-backend.log 2>&1 &
```

