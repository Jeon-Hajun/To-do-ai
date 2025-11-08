var express = require('express');
var { authenticateToken } = require('../middleware/auth');
var githubController = require('../controllers/githubController');

var router = express.Router();

// 프로젝트 GitHub 정보 동기화
router.post('/sync/:projectId', authenticateToken, githubController.sync);

// 커밋 목록 조회
router.get('/commits/:projectId', authenticateToken, githubController.getCommits);

// 이슈 목록 조회 (실시간 GitHub API 호출)
router.get('/issues/:projectId', authenticateToken, githubController.getIssues);

// 브랜치 목록 조회 (실시간 GitHub API 호출)
router.get('/branches/:projectId', authenticateToken, githubController.getBranches);

module.exports = router;
