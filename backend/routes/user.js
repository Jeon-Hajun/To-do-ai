var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var { db } = require('../database/init');
var { authenticateToken } = require('../middleware/auth');

var router = express.Router();

// 회원가입
router.post('/join', function(req, res, next) {
  const { email, password, nickname } = req.body;
  
  if (!email || !password || !nickname) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '이메일, 비밀번호, 닉네임을 모두 입력해주세요.' 
      }
    });
  }
  
  // 이메일 중복 확인
  db.get('SELECT id FROM users WHERE email = ?', [email], function(err, row) {
    if (err) {
      console.error('회원가입 오류:', err);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.' 
        }
      });
    }
    
    if (row) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'EMAIL_EXISTS',
          message: '이미 존재하는 이메일입니다.' 
        }
      });
    }
    
    // 비밀번호 해시화
    bcrypt.hash(password, 10, function(err, passwordHash) {
      if (err) {
        console.error('비밀번호 해시화 오류:', err);
        return res.status(500).json({ 
          success: false,
          error: { 
            code: 'SERVER_ERROR',
            message: '서버 오류가 발생했습니다.' 
          }
        });
      }
      
      // 사용자 생성
      db.run(
        'INSERT INTO users (email, password, nickname) VALUES (?, ?, ?)',
        [email, passwordHash, nickname],
        function(err) {
          if (err) {
            console.error('사용자 생성 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }
          
          res.status(201).json({
            success: true,
            data: {
              id: this.lastID,
              email: email,
              nickname: nickname
            },
            message: '회원가입이 완료되었습니다.'
          });
        }
      );
    });
  });
});

// 로그인
router.post('/login', function(req, res, next) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '이메일과 비밀번호를 입력해주세요.' 
      }
    });
  }
  
  // 사용자 조회
  db.get('SELECT * FROM users WHERE email = ?', [email], function(err, user) {
    if (err) {
      console.error('로그인 오류:', err);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.' 
        }
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: { 
          code: 'INVALID_CREDENTIALS',
          message: '이메일 또는 비밀번호가 올바르지 않습니다.' 
        }
      });
    }
    
    // 비밀번호 확인
    bcrypt.compare(password, user.password, function(err, isValidPassword) {
      if (err) {
        console.error('비밀번호 확인 오류:', err);
        return res.status(500).json({ 
          success: false,
          error: { 
            code: 'SERVER_ERROR',
            message: '서버 오류가 발생했습니다.' 
          }
        });
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false,
          error: { 
            code: 'INVALID_CREDENTIALS',
            message: '이메일 또는 비밀번호가 올바르지 않습니다.' 
          }
        });
      }
      
      // JWT 토큰 생성
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        data: {
          token: token,
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname
          }
        },
        message: '로그인 성공'
      });
    });
  });
});

// 로그아웃
router.post('/logout', authenticateToken, function(req, res, next) {
  // JWT는 stateless이므로 클라이언트에서 토큰을 삭제하면 됨
  // 향후 토큰 블랙리스트 기능이 필요하면 추가 가능
  res.json({
    success: true,
    message: '로그아웃되었습니다.'
  });
});

// 아이디 중복 확인
router.get('/duplicate', function(req, res, next) {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '이메일을 입력해주세요.' 
      }
    });
  }
  
  db.get('SELECT id FROM users WHERE email = ?', [email], function(err, row) {
    if (err) {
      console.error('중복 확인 오류:', err);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.' 
        }
      });
    }
    
    res.json({ 
      success: true,
      data: { 
        available: !row 
      }
    });
  });
});

// 회원정보 조회
router.get('/info', authenticateToken, function(req, res, next) {
  const userId = req.user.userId;
  
  db.get('SELECT id, email, nickname, profile_image, created_at FROM users WHERE id = ?', [userId], function(err, user) {
    if (err) {
      console.error('회원정보 조회 오류:', err);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.' 
        }
      });
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: { 
          code: 'USER_NOT_FOUND',
          message: '사용자를 찾을 수 없습니다.' 
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profileImage: user.profile_image,
        createdAt: user.created_at
      }
    });
  });
});

module.exports = router;
