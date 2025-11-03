var express = require('express');
var crypto = require('crypto');
var { db } = require('../database/init');
var { authenticateToken } = require('../middleware/auth');

var router = express.Router();

// 프로젝트 생성
router.post('/create', authenticateToken, function(req, res, next) {
  const { title, description, teamId, githubRepo } = req.body;
  const userId = req.user.userId;
  
  if (!title) {
    return res.status(400).json({ error: '프로젝트 제목을 입력해주세요.' });
  }
  
  // 팀이 지정된 경우, 사용자가 해당 팀의 멤버인지 확인
  if (teamId) {
    db.get(
      'SELECT id FROM team_users WHERE team_id = ? AND user_id = ?',
      [teamId, userId],
      function(err, membership) {
        if (err) {
          console.error('멤버십 확인 오류:', err);
          return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }
        
        if (!membership) {
          return res.status(403).json({ error: '팀 멤버가 아닙니다.' });
        }
        
        createProject();
      }
    );
  } else {
    createProject();
  }
  
  function createProject() {
    db.run(
      'INSERT INTO projects (user_id, team_id, title, description, github_repo) VALUES (?, ?, ?, ?, ?)',
      [userId, teamId || null, title, description || null, githubRepo || null],
      function(err) {
        if (err) {
          console.error('프로젝트 생성 오류:', err);
          return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }
        
        res.status(201).json({
          message: '프로젝트가 생성되었습니다.',
          project: { id: this.lastID, title, description, teamId, githubRepo }
        });
      }
    );
  }
});

// 프로젝트 목록/상세 조회
router.get('/info', authenticateToken, function(req, res, next) {
  const { id } = req.query;
  const userId = req.user.userId;
  
  if (id) {
    // 프로젝트 상세 조회
    db.get(
      `SELECT p.*, t.name as team_name 
       FROM projects p 
       LEFT JOIN teams t ON p.team_id = t.id 
       WHERE p.id = ? AND (p.user_id = ? OR EXISTS (
         SELECT 1 FROM team_users tu 
         WHERE tu.team_id = p.team_id AND tu.user_id = ?
       ))`,
      [id, userId, userId],
      function(err, project) {
        if (err) {
          console.error('프로젝트 조회 오류:', err);
          return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }
        
        if (!project) {
          return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
        }
        
        res.json({ project });
      }
    );
  } else {
    // 프로젝트 목록 조회 (사용자가 소유하거나 팀 멤버인 프로젝트)
    db.all(
      `SELECT p.*, t.name as team_name 
       FROM projects p 
       LEFT JOIN teams t ON p.team_id = t.id 
       WHERE p.user_id = ? OR EXISTS (
         SELECT 1 FROM team_users tu 
         WHERE tu.team_id = p.team_id AND tu.user_id = ?
       )
       ORDER BY p.created_at DESC`,
      [userId, userId],
      function(err, projects) {
        if (err) {
          console.error('프로젝트 목록 조회 오류:', err);
          return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }
        
        res.json({ projects: projects || [] });
      }
    );
  }
});

// GitHub 저장소 연결
router.post('/connect-github', authenticateToken, function(req, res, next) {
  const { projectId, githubRepo, githubToken } = req.body;
  const userId = req.user.userId;
  
  if (!projectId || !githubRepo) {
    return res.status(400).json({ error: '프로젝트 ID와 GitHub 저장소 URL이 필요합니다.' });
  }
  
  // 프로젝트 소유권 확인
  db.get(
    'SELECT * FROM projects WHERE id = ? AND (user_id = ? OR EXISTS (SELECT 1 FROM team_users tu WHERE tu.team_id = projects.team_id AND tu.user_id = ?))',
    [projectId, userId, userId],
    function(err, project) {
      if (err) {
        console.error('프로젝트 조회 오류:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
      
      if (!project) {
        return res.status(404).json({ error: '프로젝트를 찾을 수 없거나 권한이 없습니다.' });
      }
      
      // 토큰 암호화 (간단한 base64 인코딩, 실제 운영에서는 더 강력한 암호화 필요)
      let encryptedToken = null;
      if (githubToken) {
        encryptedToken = Buffer.from(githubToken).toString('base64');
      }
      
      // GitHub 저장소 정보 업데이트
      db.run(
        'UPDATE projects SET github_repo = ?, github_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [githubRepo, encryptedToken, projectId],
        function(err) {
          if (err) {
            console.error('GitHub 연결 오류:', err);
            return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
          }
          
          res.json({
            message: 'GitHub 저장소가 연결되었습니다.',
            project: { id: projectId, githubRepo }
          });
        }
      );
    }
  );
});

module.exports = router;

