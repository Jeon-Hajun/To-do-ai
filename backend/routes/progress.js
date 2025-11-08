var express = require('express');
var { authenticateToken } = require('../middleware/auth');
var progressController = require('../controllers/progressController');

var router = express.Router();

// 프로젝트 진행도 조회
router.get('/project/:projectId', authenticateToken, progressController.getProjectProgress);

module.exports = router;
