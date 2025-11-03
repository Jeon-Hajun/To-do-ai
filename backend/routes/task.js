var express = require('express');
var { db } = require('../database/init');
var { authenticateToken } = require('../middleware/auth');

var router = express.Router();

// 작업 생성
router.post('/create', authenticateToken, function(req, res, next) {
  const { projectId, title, description, assignedUserId, dueDate, githubIssueNumber } = req.body;
  const userId = req.user.userId;
  
  if (!projectId || !title) {
    return res.status(400).json({ error: '프로젝트 ID와 작업 제목을 입력해주세요.' });
  }
  
  // 프로젝트 접근 권한 확인
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
      
      // 할당된 사용자가 팀 멤버인지 확인 (할당된 경우)
      if (assignedUserId && project.team_id) {
        db.get(
          'SELECT id FROM team_users WHERE team_id = ? AND user_id = ?',
          [project.team_id, assignedUserId],
          function(err, membership) {
            if (err) {
              console.error('멤버십 확인 오류:', err);
              return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
            }
            
            if (!membership) {
              return res.status(400).json({ error: '할당할 사용자가 팀 멤버가 아닙니다.' });
            }
            
            createTask();
          }
        );
      } else {
        createTask();
      }
      
      function createTask() {
        db.run(
          'INSERT INTO tasks (project_id, assigned_user_id, title, description, github_issue_number, due_date) VALUES (?, ?, ?, ?, ?, ?)',
          [projectId, assignedUserId || null, title, description || null, githubIssueNumber || null, dueDate || null],
          function(err) {
            if (err) {
              console.error('작업 생성 오류:', err);
              return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
            }
            
            res.status(201).json({
              message: '작업이 생성되었습니다.',
              task: { id: this.lastID, projectId, title, description, assignedUserId, githubIssueNumber }
            });
          }
        );
      }
    }
  );
});

// 작업 목록 조회
router.get('/info', authenticateToken, function(req, res, next) {
  const { projectId } = req.query;
  const userId = req.user.userId;
  
  if (!projectId) {
    return res.status(400).json({ error: '프로젝트 ID가 필요합니다.' });
  }
  
  // 프로젝트 접근 권한 확인
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
      
      // 작업 목록 조회
      db.all(
        `SELECT t.*, u.name as assigned_user_name 
         FROM tasks t 
         LEFT JOIN users u ON t.assigned_user_id = u.id 
         WHERE t.project_id = ? 
         ORDER BY t.created_at DESC`,
        [projectId],
        function(err, tasks) {
          if (err) {
            console.error('작업 목록 조회 오류:', err);
            return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
          }
          
          res.json({ tasks: tasks || [] });
        }
      );
    }
  );
});

// 작업 수정
router.patch('/update', authenticateToken, function(req, res, next) {
  const { id, title, description, status, assignedUserId, dueDate, githubIssueNumber } = req.body;
  const userId = req.user.userId;
  
  if (!id) {
    return res.status(400).json({ error: '작업 ID가 필요합니다.' });
  }
  
  // 작업 및 프로젝트 접근 권한 확인
  db.get(
    `SELECT t.*, p.team_id 
     FROM tasks t 
     JOIN projects p ON t.project_id = p.id 
     WHERE t.id = ? AND (p.user_id = ? OR EXISTS (SELECT 1 FROM team_users tu WHERE tu.team_id = p.team_id AND tu.user_id = ?))`,
    [id, userId, userId],
    function(err, task) {
      if (err) {
        console.error('작업 조회 오류:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
      
      if (!task) {
        return res.status(404).json({ error: '작업을 찾을 수 없거나 권한이 없습니다.' });
      }
      
      // 할당된 사용자가 팀 멤버인지 확인 (할당 변경 시)
      if (assignedUserId && task.team_id && assignedUserId !== task.assigned_user_id) {
        db.get(
          'SELECT id FROM team_users WHERE team_id = ? AND user_id = ?',
          [task.team_id, assignedUserId],
          function(err, membership) {
            if (err) {
              console.error('멤버십 확인 오류:', err);
              return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
            }
            
            if (!membership) {
              return res.status(400).json({ error: '할당할 사용자가 팀 멤버가 아닙니다.' });
            }
            
            updateTask();
          }
        );
      } else {
        updateTask();
      }
      
      function updateTask() {
        var updates = [];
        var values = [];
        
        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (assignedUserId !== undefined) { updates.push('assigned_user_id = ?'); values.push(assignedUserId); }
        if (dueDate !== undefined) { updates.push('due_date = ?'); values.push(dueDate); }
        if (githubIssueNumber !== undefined) { updates.push('github_issue_number = ?'); values.push(githubIssueNumber); }
        
        if (updates.length === 0) {
          return res.status(400).json({ error: '수정할 내용이 없습니다.' });
        }
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        
        db.run(
          `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
          values,
          function(err) {
            if (err) {
              console.error('작업 수정 오류:', err);
              return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
            }
            
            res.json({ message: '작업이 수정되었습니다.' });
          }
        );
      }
    }
  );
});

// 작업 할당
router.patch('/assign', authenticateToken, function(req, res, next) {
  const { id, assignedUserId } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: '작업 ID가 필요합니다.' });
  }
  
  // 작업 및 프로젝트 접근 권한 확인
  db.get(
    `SELECT t.*, p.team_id 
     FROM tasks t 
     JOIN projects p ON t.project_id = p.id 
     WHERE t.id = ? AND (p.user_id = ? OR EXISTS (SELECT 1 FROM team_users tu WHERE tu.team_id = p.team_id AND tu.user_id = ?))`,
    [id, req.user.userId, req.user.userId],
    function(err, task) {
      if (err) {
        console.error('작업 조회 오류:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
      
      if (!task) {
        return res.status(404).json({ error: '작업을 찾을 수 없거나 권한이 없습니다.' });
      }
      
      // 할당된 사용자가 팀 멤버인지 확인 (할당 변경 시)
      if (assignedUserId && task.team_id && assignedUserId !== task.assigned_user_id) {
        db.get(
          'SELECT id FROM team_users WHERE team_id = ? AND user_id = ?',
          [task.team_id, assignedUserId],
          function(err, membership) {
            if (err) {
              console.error('멤버십 확인 오류:', err);
              return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
            }
            
            if (!membership) {
              return res.status(400).json({ error: '할당할 사용자가 팀 멤버가 아닙니다.' });
            }
            
            updateAssignment();
          }
        );
      } else {
        updateAssignment();
      }
      
      function updateAssignment() {
        db.run(
          'UPDATE tasks SET assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [assignedUserId, id],
          function(err) {
            if (err) {
              console.error('작업 할당 오류:', err);
              return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
            }
            
            res.json({ message: '작업이 할당되었습니다.' });
          }
        );
      }
    }
  );
});

module.exports = router;

