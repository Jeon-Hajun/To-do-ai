var express = require('express');
var { authenticateToken } = require('../middleware/auth');
var aiController = require('../controllers/aiController');

var router = express.Router();

// Task 제안
router.post('/task-suggestion', authenticateToken, aiController.taskSuggestion);

// 진행도 분석
router.post('/progress-analysis', authenticateToken, aiController.progressAnalysis);

// Task 완료 여부 판단
router.post('/task-completion-check', authenticateToken, aiController.taskCompletionCheck);

// 챗봇 메시지 전송
router.post('/chat', authenticateToken, aiController.chat);

// 대화 히스토리 조회
router.get('/chat/history/:projectId', authenticateToken, aiController.getChatHistory);

// 대화 세션 초기화 (컨텍스트 초기화)
router.delete('/chat/conversation/:conversationId', authenticateToken, aiController.clearConversation);

module.exports = router;
