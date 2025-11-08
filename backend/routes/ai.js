var express = require('express');
var { authenticateToken } = require('../middleware/auth');
var aiController = require('../controllers/aiController');

var router = express.Router();

// Task 제안
router.post('/task-suggestion', authenticateToken, aiController.taskSuggestion);

module.exports = router;
