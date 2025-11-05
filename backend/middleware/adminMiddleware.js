const { authMiddleware } = require('./authMiddleware');

// 관리자 권한 체크 미들웨어
const adminMiddleware = (req, res, next) => {
    // 먼저 일반 인증 미들웨어 실행
    authMiddleware(req, res, (err) => {
        if (err) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: '인증이 필요합니다.'
                }
            });
        }

        // 관리자 권한 체크
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: '관리자 권한이 필요합니다.'
                }
            });
        }

        next();
    });
};

module.exports = { adminMiddleware };
