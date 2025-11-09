var express = require('express');
var { authenticateToken } = require('../middleware/auth');
var projectController = require('../controllers/projectController');

var router = express.Router();

// 프로젝트 생성
router.post('/create', authenticateToken, projectController.create);

// 프로젝트 코드 검증
router.get('/validate-code', authenticateToken, projectController.validateCode);

// 프로젝트 참여 (공유 프로젝트용)
router.post('/join', authenticateToken, projectController.join);

// 프로젝트 구성원 목록 조회
router.get('/members', authenticateToken, projectController.getMembers);

// 프로젝트 목록/상세 조회
router.get('/info', authenticateToken, projectController.getInfo);

// GitHub 저장소 연결
router.post('/connect-github', authenticateToken, projectController.connectGithub);

// 프로젝트 수정 (owner만)
router.put('/update', authenticateToken, projectController.update);

// 프로젝트 삭제 (owner만)
router.delete('/delete', authenticateToken, projectController.delete);

// 멤버 삭제 (owner만)
router.delete('/member', authenticateToken, projectController.deleteMember);

// 프로젝트 탈퇴 (일반 멤버만)
router.delete('/leave', authenticateToken, projectController.leave);

module.exports = router;
