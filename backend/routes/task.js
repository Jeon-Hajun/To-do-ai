var express = require('express');
var { authenticateToken } = require('../middleware/auth');
var taskController = require('../controllers/taskController');

var router = express.Router();

// 작업 생성
router.post('/create', authenticateToken, taskController.create);

// 작업 목록 조회
router.get('/info', authenticateToken, taskController.getInfo);

// 작업 내용 수정
router.patch('/update', authenticateToken, taskController.update);

// 작업 상태 수정 (프로젝트 멤버)
router.patch('/status', authenticateToken, taskController.updateStatus);

// 작업 할당
router.patch('/assign', authenticateToken, taskController.assign);

// 작업 삭제
router.delete('/delete', authenticateToken, taskController.delete);

module.exports = router;
