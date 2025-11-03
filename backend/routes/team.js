var express = require('express');
var bcrypt = require('bcryptjs');
var crypto = require('crypto');
var { db } = require('../database/init');
var { authenticateToken } = require('../middleware/auth');

var router = express.Router();

// 팀 생성
router.post('/create', authenticateToken, function(req, res, next) {
  const { name, password } = req.body;
  const ownerId = req.user.userId;
  
  if (!name || !password) {
    return res.status(400).json({ error: '팀 이름과 비밀번호를 입력해주세요.' });
  }
  
  // 팀 코드 생성 (6자리 랜덤 문자열)
  const teamCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  
  // 비밀번호 해시화
  bcrypt.hash(password, 10, function(err, passwordHash) {
    if (err) {
      console.error('비밀번호 해시화 오류:', err);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
    
    // 팀 생성
    db.run(
      'INSERT INTO teams (name, team_code, password_hash, owner_id) VALUES (?, ?, ?, ?)',
      [name, teamCode, passwordHash, ownerId],
      function(err) {
        if (err) {
          console.error('팀 생성 오류:', err);
          return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }
        
        const teamId = this.lastID;
        
        // 팀 생성자를 자동으로 멤버로 추가
        db.run(
          'INSERT INTO team_users (team_id, user_id) VALUES (?, ?)',
          [teamId, ownerId],
          function(err) {
            if (err) {
              console.error('팀 멤버 추가 오류:', err);
            }
            
            res.status(201).json({
              message: '팀이 생성되었습니다.',
              team: { id: teamId, name, teamCode }
            });
          }
        );
      }
    );
  });
});

// 팀 참여
router.post('/join', authenticateToken, function(req, res, next) {
  const { teamCode, password } = req.body;
  const userId = req.user.userId;
  
  if (!teamCode || !password) {
    return res.status(400).json({ error: '팀 코드와 비밀번호를 입력해주세요.' });
  }
  
  // 팀 조회
  db.get('SELECT * FROM teams WHERE team_code = ?', [teamCode], function(err, team) {
    if (err) {
      console.error('팀 조회 오류:', err);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
    
    if (!team) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다.' });
    }
    
    // 비밀번호 확인
    bcrypt.compare(password, team.password_hash, function(err, isValidPassword) {
      if (err) {
        console.error('비밀번호 확인 오류:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
      }
      
      // 이미 멤버인지 확인
      db.get(
        'SELECT id FROM team_users WHERE team_id = ? AND user_id = ?',
        [team.id, userId],
        function(err, row) {
          if (err) {
            console.error('멤버 확인 오류:', err);
            return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
          }
          
          if (row) {
            return res.status(400).json({ error: '이미 팀 멤버입니다.' });
          }
          
          // 팀 멤버로 추가
          db.run(
            'INSERT INTO team_users (team_id, user_id) VALUES (?, ?)',
            [team.id, userId],
            function(err) {
              if (err) {
                console.error('팀 참여 오류:', err);
                return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
              }
              
              res.json({
                message: '팀에 참여했습니다.',
                team: { id: team.id, name: team.name, teamCode: team.team_code }
              });
            }
          );
        }
      );
    });
  });
});

// 팀 정보 및 멤버 목록 조회
router.get('/info', authenticateToken, function(req, res, next) {
  const { teamId } = req.query;
  const userId = req.user.userId;
  
  if (!teamId) {
    return res.status(400).json({ error: '팀 ID가 필요합니다.' });
  }
  
  // 사용자가 해당 팀의 멤버인지 확인
  db.get(
    'SELECT * FROM team_users WHERE team_id = ? AND user_id = ?',
    [teamId, userId],
    function(err, membership) {
      if (err) {
        console.error('멤버십 확인 오류:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
      
      if (!membership) {
        return res.status(403).json({ error: '팀 멤버가 아닙니다.' });
      }
      
      // 팀 정보 조회
      db.get('SELECT id, name, team_code, owner_id, created_at FROM teams WHERE id = ?', [teamId], function(err, team) {
        if (err) {
          console.error('팀 조회 오류:', err);
          return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }
        
        if (!team) {
          return res.status(404).json({ error: '팀을 찾을 수 없습니다.' });
        }
        
        // 팀 멤버 목록 조회
        db.all(
          `SELECT u.id, u.email, u.name, tu.joined_at 
           FROM team_users tu 
           JOIN users u ON tu.user_id = u.id 
           WHERE tu.team_id = ?`,
          [teamId],
          function(err, members) {
            if (err) {
              console.error('멤버 목록 조회 오류:', err);
              return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
            }
            
            res.json({
              team: {
                ...team,
                members: members || []
              }
            });
          }
        );
      });
    }
  );
});

module.exports = router;

