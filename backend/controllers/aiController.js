var axios = require('axios');
var { db } = require('../database/db');

// AI 백엔드 URL (환경변수에서 가져오거나 기본값 사용)
var AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:5000';

// Task 제안
exports.taskSuggestion = async function(req, res, next) {
  const { projectId, includeCommits, includeIssues } = req.body;
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
    `SELECT p.*, pm.role 
     FROM projects p
     JOIN project_members pm ON p.id = pm.project_id
     WHERE p.id = ? AND pm.user_id = ?`,
    [projectId, userId],
    async function(err, project) {
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
        return res.status(403).json({ 
          success: false,
          error: { 
            code: 'FORBIDDEN',
            message: '프로젝트에 대한 권한이 없습니다.' 
          }
        });
      }
      
      try {
        // 커밋 데이터 수집
        let commits = [];
        if (includeCommits) {
          commits = await new Promise((resolve, reject) => {
            db.all(
              `SELECT commit_message, author, commit_date, lines_added, lines_deleted
               FROM project_commits
               WHERE project_id = ?
               ORDER BY commit_date DESC
               LIMIT 50`,
              [projectId],
              function(err, rows) {
                if (err) {
                  reject(err);
                } else {
                  resolve(rows.map(r => ({
                    message: r.commit_message,
                    author: r.author,
                    date: r.commit_date,
                    linesAdded: r.lines_added,
                    linesDeleted: r.lines_deleted
                  })));
                }
              }
            );
          });
        }
        
        // 현재 Task 목록 수집
        const currentTasks = await new Promise((resolve, reject) => {
          db.all(
            `SELECT title, description, status
             FROM tasks
             WHERE project_id = ?
             ORDER BY created_at DESC`,
            [projectId],
            function(err, rows) {
              if (err) {
                reject(err);
              } else {
                resolve(rows);
              }
            }
          );
        });
        
        // AI 백엔드로 요청 전달
        const aiResponse = await axios.post(
          `${AI_BACKEND_URL}/api/ai/task-suggestion`,
          {
            commits: commits,
            currentTasks: currentTasks,
            projectDescription: project.description || project.title
          },
          {
            timeout: 120000 // 2분 타임아웃
          }
        );
        
        // AI 로그 저장
        const suggestions = aiResponse.data.suggestions || [];
        db.run(
          `INSERT INTO ai_logs (user_id, project_id, type, input, output)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            projectId,
            'task_suggestion',
            JSON.stringify({ commits: commits.length, tasks: currentTasks.length }),
            JSON.stringify(suggestions)
          ],
          function(err) {
            if (err) {
              console.error('AI 로그 저장 오류:', err);
              // 로그 저장 실패해도 응답은 정상 반환
            }
          }
        );
        
        res.json({
          success: true,
          data: {
            suggestions: suggestions
          },
          message: 'Task 제안이 생성되었습니다.'
        });
        
      } catch (error) {
        console.error('AI 요청 오류:', error);
        
        // AI 백엔드 연결 실패 시
        if (error.code === 'ECONNREFUSED' || error.response === undefined) {
          return res.status(503).json({ 
            success: false,
            error: { 
              code: 'AI_BACKEND_UNAVAILABLE',
              message: 'AI 서비스에 연결할 수 없습니다. AI 백엔드가 실행 중인지 확인해주세요.' 
            }
          });
        }
        
        // 기타 오류
        return res.status(500).json({ 
          success: false,
          error: { 
            code: 'AI_REQUEST_FAILED',
            message: 'AI 요청 처리 중 오류가 발생했습니다.' 
          }
        });
      }
    }
  );
};

