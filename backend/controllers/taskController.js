var { db } = require('../database/db');
var { validateTaskTitle, validateTaskDescription, validateId } = require('../utils/validators');

// 작업 생성
exports.create = function(req, res, next) {
  const { projectId, title, description, assignedUserId, dueDate, githubIssueNumber } = req.body;
  const userId = req.user.userId;
  
  // 입력 검증
  const idValidation = validateId(projectId, '프로젝트 ID');
  if (!idValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: idValidation.message
      }
    });
  }
  
  const titleValidation = validateTaskTitle(title);
  if (!titleValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: titleValidation.message
      }
    });
  }
  
  // 설명 검증 (선택 필드)
  if (description !== undefined) {
    const descriptionValidation = validateTaskDescription(description);
    if (!descriptionValidation.valid) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'INVALID_INPUT',
          message: descriptionValidation.message
        }
      });
    }
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
};

// 작업 목록/상세 조회
exports.getInfo = function(req, res, next) {
  const { id, projectId } = req.query;
  const userId = req.user.userId;
  
  if (id) {
    // 작업 상세 조회
    const idValidation = validateId(id, '작업 ID');
    if (!idValidation.valid) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'INVALID_INPUT',
          message: idValidation.message
        }
      });
    }
    db.get(
      `SELECT t.*, u.nickname as assigned_user_name 
       FROM tasks t 
       LEFT JOIN users u ON t.assigned_user_id = u.id 
       WHERE t.id = ? AND EXISTS (
         SELECT 1 FROM project_members pm 
         WHERE pm.project_id = t.project_id AND pm.user_id = ?
       )`,
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
        
        res.json({
          success: true,
          data: {
            task: {
              id: task.id,
              projectId: task.project_id,
              title: task.title,
              description: task.description,
              status: task.status,
              assignedUserId: task.assigned_user_id,
              assignedUserName: task.assigned_user_name,
              dueDate: task.due_date,
              githubIssueNumber: task.github_issue_number,
              createdAt: task.created_at,
              updatedAt: task.updated_at
            }
          }
        });
      }
    );
  } else {
    // 작업 목록 조회
    if (!projectId) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'MISSING_FIELDS',
          message: '프로젝트 ID 또는 작업 ID가 필요합니다.' 
        }
      });
    }
    
    const projectIdValidation = validateId(projectId, '프로젝트 ID');
    if (!projectIdValidation.valid) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'INVALID_INPUT',
          message: projectIdValidation.message
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
  }
};

// 작업 수정 (owner만, 제목, 설명, 마감일, GitHub 이슈만 수정 가능)
exports.update = function(req, res, next) {
  const { id, title, description, dueDate, githubIssueNumber } = req.body;
  const userId = req.user.userId;
  
  // 입력 검증
  const idValidation = validateId(id, '작업 ID');
  if (!idValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: idValidation.message
      }
    });
  }
  
  // 제목 검증 (제공된 경우)
  if (title !== undefined) {
    const titleValidation = validateTaskTitle(title);
    if (!titleValidation.valid) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'INVALID_INPUT',
          message: titleValidation.message
        }
      });
    }
  }
  
  // 설명 검증 (제공된 경우)
  if (description !== undefined) {
    const descriptionValidation = validateTaskDescription(description);
    if (!descriptionValidation.valid) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'INVALID_INPUT',
          message: descriptionValidation.message
        }
      });
    }
  }
  
  // 작업 및 owner 권한 확인
  db.get(
    `SELECT t.project_id, pm.role
     FROM tasks t 
     JOIN project_members pm ON t.project_id = pm.project_id
     WHERE t.id = ? AND pm.user_id = ? AND pm.role = 'owner'`,
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
        return res.status(403).json({ 
          success: false,
          error: { 
            code: 'FORBIDDEN',
            message: '작업을 수정할 권한이 없습니다. (owner만 가능)' 
          }
        });
      }
      
      function updateTask() {
        var updates = [];
        var values = [];
        
        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
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
      
      updateTask();
    }
  );
};

// 작업 상태 수정 (프로젝트 멤버)
exports.updateStatus = function(req, res, next) {
  const { id, status } = req.body;
  const userId = req.user.userId;
  
  // 입력 검증
  const idValidation = validateId(id, '작업 ID');
  if (!idValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: idValidation.message
      }
    });
  }
  
  if (status === undefined || typeof status !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '작업 상태가 필요합니다.' 
      }
    });
  }
  
  // 상태 값 검증
  if (!['todo', 'in_progress', 'done', 'cancelled'].includes(status)) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_STATUS',
        message: '유효하지 않은 상태 값입니다. (todo, in_progress, done, cancelled만 가능)' 
      }
    });
  }
  
  // 작업 및 프로젝트 멤버 확인
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
      
      // 상태 업데이트
      db.run(
        'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id],
        function(err) {
          if (err) {
            console.error('작업 상태 수정 오류:', err);
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
            message: '작업 상태가 수정되었습니다.' 
          });
        }
      );
    }
  );
};

// 작업 할당 (owner만)
exports.assign = function(req, res, next) {
  const { id, assignedUserId } = req.body;
  const userId = req.user.userId;
  
  // 입력 검증
  const idValidation = validateId(id, '작업 ID');
  if (!idValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: idValidation.message
      }
    });
  }
  
  // 할당 사용자 ID 검증 (제공된 경우)
  if (assignedUserId !== undefined && assignedUserId !== null) {
    const assigneeIdValidation = validateId(assignedUserId, '할당 사용자 ID');
    if (!assigneeIdValidation.valid) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'INVALID_INPUT',
          message: assigneeIdValidation.message
        }
      });
    }
  }
  
  // 작업 및 owner 권한 확인
  db.get(
    `SELECT t.project_id, pm.role
     FROM tasks t 
     JOIN project_members pm ON t.project_id = pm.project_id
     WHERE t.id = ? AND pm.user_id = ? AND pm.role = 'owner'`,
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
        return res.status(403).json({ 
          success: false,
          error: { 
            code: 'FORBIDDEN',
            message: '작업을 할당할 권한이 없습니다. (owner만 가능)' 
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
};

// 작업 삭제 (owner만)
exports.delete = function(req, res, next) {
  const { id } = req.body;
  const userId = req.user.userId;
  
  // 입력 검증
  const idValidation = validateId(id, '작업 ID');
  if (!idValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: idValidation.message
      }
    });
  }
  
  // 작업 및 owner 권한 확인
  db.get(
    `SELECT t.project_id, pm.role
     FROM tasks t 
     JOIN project_members pm ON t.project_id = pm.project_id
     WHERE t.id = ? AND pm.user_id = ? AND pm.role = 'owner'`,
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
        return res.status(403).json({ 
          success: false,
          error: { 
            code: 'FORBIDDEN',
            message: '작업을 삭제할 권한이 없습니다. (owner만 가능)' 
          }
        });
      }
      
      // 작업 삭제
      db.run(
        'DELETE FROM tasks WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('작업 삭제 오류:', err);
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
            message: '작업이 삭제되었습니다.' 
          });
        }
      );
    }
  );
};

