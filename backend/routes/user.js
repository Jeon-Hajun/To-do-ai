var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var { db } = require('../database/init');
var { authenticateToken } = require('../middleware/auth');

var router = express.Router();

// 회원가입
router.post('/join', function(req, res, next) {
  const { email, password, name } = req.body;
  
  // 이메일 중복 확인
  db.get('SELECT id FROM users WHERE email = ?', [email], function(err, row) {
    if (err) {
      console.error('회원가입 오류:', err);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
    
    if (row) {
      return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });
    }
    
    // 비밀번호 해시화
    bcrypt.hash(password, 10, function(err, passwordHash) {
      if (err) {
        console.error('비밀번호 해시화 오류:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
      
      // 사용자 생성
      db.run(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
        [email, passwordHash, name],
        function(err) {
          if (err) {
            console.error('사용자 생성 오류:', err);
            return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
          }
          
          res.status(201).json({
            message: '회원가입이 완료되었습니다.',
            user: { id: this.lastID, email, name }
          });
        }
      );
    });
  });
});

// 로그인
router.post('/login', function(req, res, next) {
  const { email, password } = req.body;
  
  // 사용자 조회
  db.get('SELECT * FROM users WHERE email = ?', [email], function(err, user) {
    if (err) {
      console.error('로그인 오류:', err);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
    
    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    
    // 비밀번호 확인
    bcrypt.compare(password, user.password_hash, function(err, isValidPassword) {
      if (err) {
        console.error('비밀번호 확인 오류:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      }
      
      // JWT 토큰 생성
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        message: '로그인 성공',
        token,
        user: { id: user.id, email: user.email, name: user.name }
      });
    });
  });
});

// 아이디 중복 확인
router.get('/duplicate', function(req, res, next) {
  const { email } = req.query;
  
  db.get('SELECT id FROM users WHERE email = ?', [email], function(err, row) {
    if (err) {
      console.error('중복 확인 오류:', err);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
    
    res.json({ available: !row });
  });
});

// 회원정보 조회
router.get('/info', authenticateToken, function(req, res, next) {
  const userId = req.user.userId;
  
  db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [userId], function(err, user) {
    if (err) {
      console.error('회원정보 조회 오류:', err);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
    
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json({ user });
  });
});

module.exports = router;
