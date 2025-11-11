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

module.exports = router;
