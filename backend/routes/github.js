var express = require('express');
var { authenticateToken } = require('../middleware/auth');
var githubController = require('../controllers/githubController');

var router = express.Router();

// 프로젝트 GitHub 정보 동기화
router.post('/sync/:projectId', authenticateToken, githubController.sync);

// 커밋 목록 조회
router.get('/commits/:projectId', authenticateToken, githubController.getCommits);

// 커밋 상세 조회
router.get('/commits/:projectId/:commitSha', authenticateToken, githubController.getCommit);

// 이슈 목록 조회
router.get('/issues/:projectId', authenticateToken, githubController.getIssues);

// 이슈 상세 조회
router.get('/issues/:projectId/:issueNumber', authenticateToken, githubController.getIssue);

// 브랜치 목록 조회 (DB에 저장된 데이터)
router.get('/branches/:projectId', authenticateToken, githubController.getBranches);

// 브랜치 상세 조회
router.get('/branches/:projectId/:branchName', authenticateToken, githubController.getBranch);

module.exports = router;
