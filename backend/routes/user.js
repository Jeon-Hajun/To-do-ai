var express = require('express');
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var { authenticateToken } = require('../middleware/auth');
var userController = require('../controllers/userController');

var router = express.Router();

// 프로필 이미지 저장 폴더 및 파일명 설정
var profileDir = path.join(__dirname, '../public/profile');
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
          }
          
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, profileDir);
  },
  filename: function(req, file, cb) {
    cb(null, req.user.userId + '.png');
    }
});

var upload = multer({ storage: storage });

// 회원가입
router.post('/signup', userController.signup);

// 로그인
router.post('/login', userController.login);

// 아이디 중복 확인
router.get('/duplicate', userController.checkDuplicate);

// 내 정보 조회
router.get('/me', authenticateToken, userController.getMe);

// 회원 정보 수정
router.put('/me', authenticateToken, userController.updateMe);

// 프로필 이미지 업로드
router.post('/me/profile-image', authenticateToken, upload.single('profileImage'), userController.uploadProfileImage);

// 프로필 이미지 삭제
router.delete('/me/profile-image', authenticateToken, userController.deleteProfileImage);

// 회원 탈퇴
router.delete('/me', authenticateToken, userController.deleteMe);

// 사용자 Tag 관리
router.post('/:userId/tags', authenticateToken, userController.addTag);
router.delete('/:userId/tags/:tag', authenticateToken, userController.removeTag);
router.get('/:userId/tags', authenticateToken, userController.getTags);

module.exports = router;
