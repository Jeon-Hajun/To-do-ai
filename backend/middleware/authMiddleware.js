const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.authMiddleware = (req, res, next) => {
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

exports.authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'NO_TOKEN',
                message: '토큰이 없습니다.'
            }
        });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'NO_TOKEN',
                message: '토큰이 없습니다.'
            }
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: '유효하지 않은 토큰입니다.'
            }
        });
    }
};

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};
