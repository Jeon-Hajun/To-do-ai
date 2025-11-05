// 인증 미들웨어 (기존 코드 호환성을 위한 파일)
var { authenticateToken, authMiddleware } = require('./authMiddleware');

module.exports = {
  authenticateToken: authenticateToken,
  authMiddleware: authMiddleware
};

