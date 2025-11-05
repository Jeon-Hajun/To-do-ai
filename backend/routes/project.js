var express = require('express');
var crypto = require('crypto');
var bcrypt = require('bcryptjs');
var { db } = require('../database/db');
var { authenticateToken } = require('../middleware/auth');

var router = express.Router();

// 프로젝트 코드 생성 (6자리 영숫자)
function generateProjectCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 프로젝트 생성
router.post('/create', authenticateToken, function(req, res, next) {
  const { title, description, isShared, password, githubRepo } = req.body;
  const userId = req.user.userId;
  
  if (!title) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '프로젝트 제목을 입력해주세요.' 
      }
    });
  }
  
  // 공유 프로젝트인 경우 비밀번호 해시화
  let passwordHash = null;
  let projectCode = null;
  
  if (isShared) {
    projectCode = generateProjectCode();
    // 프로젝트 코드 중복 확인
    db.get('SELECT id FROM projects WHERE project_code = ?', [projectCode], function(err, existing) {
      if (err) {
        console.error('프로젝트 코드 확인 오류:', err);
        return res.status(500).json({ 
          success: false,
          error: { 
            code: 'SERVER_ERROR',
            message: '서버 오류가 발생했습니다.' 
          }
        });
      }
      
      if (existing) {
        // 코드가 중복되면 다시 생성 (거의 발생하지 않지만 안전장치)
        projectCode = generateProjectCode();
      }
      
      if (password) {
        bcrypt.hash(password, 10, function(err, hash) {
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
          passwordHash = hash;
          createProject();
        });
      } else {
        createProject();
      }
    });
  } else {
    createProject();
  }
  
  function createProject() {
    db.run(
      'INSERT INTO projects (owner_id, title, description, project_code, password_hash, github_repo) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title, description || null, projectCode, passwordHash, githubRepo || null],
      function(err) {
        if (err) {
          console.error('프로젝트 생성 오류:', err);
          return res.status(500).json({ 
            success: false,
            error: { 
              code: 'SERVER_ERROR',
              message: '서버 오류가 발생했습니다.' 
            }
          });
        }
        
        const projectId = this.lastID;
        
        // 프로젝트 멤버에 owner 추가
        db.run(
          'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
          [projectId, userId, 'owner'],
          function(err) {
            if (err) {
              console.error('프로젝트 멤버 추가 오류:', err);
              // 프로젝트는 생성되었지만 멤버 추가 실패 - 롤백 고려 필요
            }
            
            res.status(201).json({
              success: true,
              data: {
                id: projectId,
                title: title,
                projectCode: projectCode,
                githubRepo: githubRepo || null
              },
              message: '프로젝트가 생성되었습니다.'
            });
          }
        );
      }
    );
  }
});

// 프로젝트 참여 (공유 프로젝트용)
router.post('/join', authenticateToken, function(req, res, next) {
  const { projectCode, password } = req.body;
  const userId = req.user.userId;
  
  if (!projectCode) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '프로젝트 코드를 입력해주세요.' 
      }
    });
  }
  
  // 프로젝트 조회
  db.get('SELECT * FROM projects WHERE project_code = ?', [projectCode], function(err, project) {
    if (err) {
      console.error('프로젝트 조회 오류:', err);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.' 
        }
      });
    }
    
    if (!project) {
      return res.status(404).json({ 
        success: false,
        error: { 
          code: 'PROJECT_NOT_FOUND',
          message: '프로젝트를 찾을 수 없습니다.' 
        }
      });
    }
    
    // 비밀번호 확인
    if (project.password_hash) {
      if (!password) {
        return res.status(400).json({ 
          success: false,
          error: { 
            code: 'PASSWORD_REQUIRED',
            message: '비밀번호를 입력해주세요.' 
          }
        });
      }
      
      bcrypt.compare(password, project.password_hash, function(err, isValid) {
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
        
        if (!isValid) {
          return res.status(401).json({ 
            success: false,
            error: { 
              code: 'INVALID_PASSWORD',
              message: '비밀번호가 올바르지 않습니다.' 
            }
          });
        }
        
        addMember();
      });
    } else {
      addMember();
    }
    
    function addMember() {
      // 이미 멤버인지 확인
      db.get(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [project.id, userId],
        function(err, existing) {
          if (err) {
            console.error('멤버 확인 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }
          
          if (existing) {
            return res.status(400).json({ 
              success: false,
              error: { 
                code: 'ALREADY_MEMBER',
                message: '이미 프로젝트에 참여중입니다.' 
              }
            });
          }
          
          // 프로젝트 멤버 추가
          db.run(
            'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
            [project.id, userId, 'member'],
            function(err) {
              if (err) {
                console.error('프로젝트 멤버 추가 오류:', err);
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
                  id: project.id,
                  title: project.title
                },
                message: '프로젝트에 참여했습니다.'
              });
            }
          );
        }
      );
    }
  });
});

// 프로젝트 구성원 목록 조회
router.get('/members', authenticateToken, function(req, res, next) {
  const { projectId } = req.query;
  const userId = req.user.userId;
  
  if (!projectId) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '프로젝트 ID가 필요합니다.' 
      }
    });
  }
  
  // 프로젝트 멤버인지 확인
  db.get(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId],
    function(err, membership) {
      if (err) {
        console.error('멤버십 확인 오류:', err);
        return res.status(500).json({ 
          success: false,
          error: { 
            code: 'SERVER_ERROR',
            message: '서버 오류가 발생했습니다.' 
          }
        });
      }
      
      if (!membership) {
        return res.status(403).json({ 
          success: false,
          error: { 
            code: 'FORBIDDEN',
            message: '프로젝트에 대한 권한이 없습니다.' 
          }
        });
      }
      
      // 구성원 목록 조회
      db.all(
        `SELECT u.id, u.email, u.nickname, pm.role, pm.joined_at
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = ?
         ORDER BY pm.joined_at ASC`,
        [projectId],
        function(err, members) {
          if (err) {
            console.error('구성원 목록 조회 오류:', err);
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
              members: members.map(m => ({
                id: m.id,
                email: m.email,
                nickname: m.nickname,
                role: m.role,
                joinedAt: m.joined_at
              }))
            }
          });
        }
      );
    }
  );
});

// 프로젝트 목록/상세 조회
router.get('/info', authenticateToken, function(req, res, next) {
  const { id } = req.query;
  const userId = req.user.userId;
  
  if (id) {
    // 프로젝트 상세 조회
    db.get(
      `SELECT p.*, COUNT(pm.id) as member_count
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = ? AND EXISTS (
         SELECT 1 FROM project_members pm2 
         WHERE pm2.project_id = p.id AND pm2.user_id = ?
       )
       GROUP BY p.id`,
      [id, userId],
      function(err, project) {
        if (err) {
          console.error('프로젝트 조회 오류:', err);
          return res.status(500).json({ 
            success: false,
            error: { 
              code: 'SERVER_ERROR',
              message: '서버 오류가 발생했습니다.' 
            }
          });
        }
        
        if (!project) {
          return res.status(404).json({ 
            success: false,
            error: { 
              code: 'PROJECT_NOT_FOUND',
              message: '프로젝트를 찾을 수 없거나 권한이 없습니다.' 
            }
          });
        }
        
        res.json({
          success: true,
          data: {
            project: {
              id: project.id,
              title: project.title,
              description: project.description,
              githubRepo: project.github_repo,
              status: project.status,
              ownerId: project.owner_id,
              isShared: !!project.project_code,
              projectCode: project.project_code
            }
          }
        });
      }
    );
  } else {
    // 프로젝트 목록 조회 (사용자가 멤버인 프로젝트)
    db.all(
      `SELECT p.id, p.title, p.status, p.project_code, COUNT(pm.id) as member_count
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [userId],
      function(err, projects) {
        if (err) {
          console.error('프로젝트 목록 조회 오류:', err);
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
            projects: (projects || []).map(p => ({
              id: p.id,
              title: p.title,
              status: p.status,
              memberCount: p.member_count,
              isShared: !!p.project_code
            }))
          }
        });
      }
    );
  }
});

// GitHub 저장소 연결
router.post('/connect-github', authenticateToken, function(req, res, next) {
  const { projectId, githubRepo, githubToken } = req.body;
  const userId = req.user.userId;
  
  if (!projectId || !githubRepo) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '프로젝트 ID와 GitHub 저장소 URL이 필요합니다.' 
      }
    });
  }
  
  // 프로젝트 멤버인지 확인 (owner 또는 admin만 수정 가능하도록 할 수도 있음)
  db.get(
    `SELECT p.*, pm.role 
     FROM projects p
     JOIN project_members pm ON p.id = pm.project_id
     WHERE p.id = ? AND pm.user_id = ?`,
    [projectId, userId],
    function(err, result) {
      if (err) {
        console.error('프로젝트 조회 오류:', err);
        return res.status(500).json({ 
          success: false,
          error: { 
            code: 'SERVER_ERROR',
            message: '서버 오류가 발생했습니다.' 
          }
        });
      }
      
      if (!result) {
        return res.status(404).json({ 
          success: false,
          error: { 
            code: 'PROJECT_NOT_FOUND',
            message: '프로젝트를 찾을 수 없거나 권한이 없습니다.' 
          }
        });
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
            message: 'GitHub 저장소가 연결되었습니다.'
          });
        }
      );
    }
  );
});

module.exports = router;
