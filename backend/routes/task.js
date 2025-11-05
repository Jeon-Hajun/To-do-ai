var express = require('express');
var { db } = require('../database/db');
var { authenticateToken } = require('../middleware/auth');

var router = express.Router();

// 작업 생성
router.post('/create', authenticateToken, function(req, res, next) {
  const { projectId, title, description, assignedUserId, dueDate, githubIssueNumber } = req.body;
  const userId = req.user.userId;
  
  if (!projectId || !title) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '프로젝트 ID와 작업 제목을 입력해주세요.' 
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
      
      // 할당된 사용자가 프로젝트 멤버인지 확인 (할당된 경우)
      if (assignedUserId && assignedUserId !== userId) {
        db.get(
          'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
          [projectId, assignedUserId],
          function(err, assigneeMembership) {
            if (err) {
              console.error('할당자 멤버십 확인 오류:', err);
              return res.status(500).json({ 
                success: false,
                error: { 
                  code: 'SERVER_ERROR',
                  message: '서버 오류가 발생했습니다.' 
                }
              });
            }
            
            if (!assigneeMembership) {
              return res.status(400).json({ 
                success: false,
                error: { 
                  code: 'INVALID_ASSIGNEE',
                  message: '할당할 사용자가 프로젝트 멤버가 아닙니다.' 
                }
              });
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
                title: title,
                status: 'todo'
              },
              message: '작업이 생성되었습니다.'
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
      
      // 작업 목록 조회
      db.all(
        `SELECT t.*, u.nickname as assigned_user_name 
         FROM tasks t 
         LEFT JOIN users u ON t.assigned_user_id = u.id 
         WHERE t.project_id = ? 
         ORDER BY t.created_at DESC`,
        [projectId],
        function(err, tasks) {
          if (err) {
            console.error('작업 목록 조회 오류:', err);
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
              tasks: (tasks || []).map(t => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                assignedUserName: t.assigned_user_name,
                dueDate: t.due_date,
                githubIssueNumber: t.github_issue_number
              }))
            }
          });
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
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '작업 ID가 필요합니다.' 
      }
    });
  }
  
  // 작업 및 프로젝트 접근 권한 확인
  db.get(
    `SELECT t.project_id, pm.id as membership_id
     FROM tasks t 
     JOIN project_members pm ON t.project_id = pm.project_id
     WHERE t.id = ? AND pm.user_id = ?`,
    [id, userId],
    function(err, task) {
      if (err) {
        console.error('작업 조회 오류:', err);
        return res.status(500).json({ 
          success: false,
          error: { 
            code: 'SERVER_ERROR',
            message: '서버 오류가 발생했습니다.' 
          }
        });
      }
      
      if (!task) {
        return res.status(404).json({ 
          success: false,
          error: { 
            code: 'TASK_NOT_FOUND',
            message: '작업을 찾을 수 없거나 권한이 없습니다.' 
          }
        });
      }
      
      // 할당된 사용자가 프로젝트 멤버인지 확인 (할당 변경 시)
      if (assignedUserId && assignedUserId !== task.assigned_user_id) {
        db.get(
          'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
          [task.project_id, assignedUserId],
          function(err, assigneeMembership) {
            if (err) {
              console.error('할당자 멤버십 확인 오류:', err);
              return res.status(500).json({ 
                success: false,
                error: { 
                  code: 'SERVER_ERROR',
                  message: '서버 오류가 발생했습니다.' 
                }
              });
            }
            
            if (!assigneeMembership) {
              return res.status(400).json({ 
                success: false,
                error: { 
                  code: 'INVALID_ASSIGNEE',
                  message: '할당할 사용자가 프로젝트 멤버가 아닙니다.' 
                }
              });
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
        if (status !== undefined) { 
          // status 값 검증
          if (!['todo', 'in_progress', 'done', 'cancelled'].includes(status)) {
            return res.status(400).json({ 
              success: false,
              error: { 
                code: 'INVALID_STATUS',
                message: '유효하지 않은 상태 값입니다.' 
              }
            });
          }
          updates.push('status = ?'); 
          values.push(status); 
        }
        if (assignedUserId !== undefined) { updates.push('assigned_user_id = ?'); values.push(assignedUserId); }
        if (dueDate !== undefined) { updates.push('due_date = ?'); values.push(dueDate); }
        if (githubIssueNumber !== undefined) { updates.push('github_issue_number = ?'); values.push(githubIssueNumber); }
        
        if (updates.length === 0) {
          return res.status(400).json({ 
            success: false,
            error: { 
              code: 'NO_CHANGES',
              message: '수정할 내용이 없습니다.' 
            }
          });
        }
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        
        db.run(
          `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
          values,
          function(err) {
            if (err) {
              console.error('작업 수정 오류:', err);
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
              message: '작업이 수정되었습니다.' 
            });
          }
        );
      }
    }
  );
});

// 작업 할당
router.patch('/assign', authenticateToken, function(req, res, next) {
  const { id, assignedUserId } = req.body;
  const userId = req.user.userId;
  
  if (!id) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '작업 ID가 필요합니다.' 
      }
    });
  }
  
  // 작업 및 프로젝트 접근 권한 확인
  db.get(
    `SELECT t.project_id
     FROM tasks t 
     JOIN project_members pm ON t.project_id = pm.project_id
     WHERE t.id = ? AND pm.user_id = ?`,
    [id, userId],
    function(err, task) {
      if (err) {
        console.error('작업 조회 오류:', err);
        return res.status(500).json({ 
          success: false,
          error: { 
            code: 'SERVER_ERROR',
            message: '서버 오류가 발생했습니다.' 
          }
        });
      }
      
      if (!task) {
        return res.status(404).json({ 
          success: false,
          error: { 
            code: 'TASK_NOT_FOUND',
            message: '작업을 찾을 수 없거나 권한이 없습니다.' 
          }
        });
      }
      
      // 할당된 사용자가 프로젝트 멤버인지 확인
      if (assignedUserId) {
        db.get(
          'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
          [task.project_id, assignedUserId],
          function(err, assigneeMembership) {
            if (err) {
              console.error('할당자 멤버십 확인 오류:', err);
              return res.status(500).json({ 
                success: false,
                error: { 
                  code: 'SERVER_ERROR',
                  message: '서버 오류가 발생했습니다.' 
                }
              });
            }
            
            if (!assigneeMembership) {
              return res.status(400).json({ 
                success: false,
                error: { 
                  code: 'INVALID_ASSIGNEE',
                  message: '할당할 사용자가 프로젝트 멤버가 아닙니다.' 
                }
              });
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
          [assignedUserId || null, id],
          function(err) {
            if (err) {
              console.error('작업 할당 오류:', err);
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
              message: '작업이 할당되었습니다.' 
            });
          }
        );
      }
    }
  );
});

module.exports = router;
