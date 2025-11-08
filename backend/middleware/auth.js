const jwt = require('jsonwebtoken');
require('dotenv').config();

// 인증 미들웨어 (통합)
exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'NO_TOKEN',
                message: '토큰이 없습니다.'
            }
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: '유효하지 않은 토큰입니다.'
                }
            });
        }

        req.user = user;
        next();
    });
};
