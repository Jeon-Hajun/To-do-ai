var axios = require('axios');
var { db } = require('../database/db');

// AI 백엔드 URL (환경변수에서 가져오거나 기본값 사용)
var AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:5001';

console.log('[AI Controller] AI 백엔드 URL:', AI_BACKEND_URL);

// Task 제안
exports.taskSuggestion = async function(req, res, next) {
  console.log('[AI Controller] taskSuggestion 요청 수신:', { 
    projectId: req.body.projectId, 
    includeCommits: req.body.includeCommits,
    includeIssues: req.body.includeIssues,
    userId: req.user?.userId 
  });
  
  const { projectId, includeCommits = true, includeIssues = true } = req.body;
  const userId = req.user.userId;
  
  if (!projectId) {
    console.error('[AI Controller] taskSuggestion - projectId 없음');
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
        console.log('[AI Controller] taskSuggestion - 데이터 수집 시작');
        
        // 커밋 데이터 수집 (통계 포함)
        let commits = [];
        if (includeCommits) {
          console.log('[AI Controller] taskSuggestion - 커밋 데이터 조회 중...');
          commits = await new Promise((resolve, reject) => {
            db.all(
              `SELECT commit_sha, commit_message, author, commit_date, lines_added, lines_deleted, files_changed
               FROM project_commits
               WHERE project_id = ?
               ORDER BY commit_date DESC
               LIMIT 50`,
              [projectId],
              async function(err, rows) {
                if (err) {
                  console.error('[AI Controller] taskSuggestion - 커밋 조회 오류:', err);
                  reject(err);
                } else {
                  console.log('[AI Controller] taskSuggestion - 커밋 조회 완료:', rows.length, '개');
                  // 각 커밋의 파일 변경 정보도 수집
                  const commitsWithFiles = await Promise.all(
                    rows.map(async (r) => {
                      const files = await new Promise((resolveFiles, rejectFiles) => {
                        db.all(
                          `SELECT file_path, status, additions, deletions
                           FROM project_commit_files
                           WHERE project_id = ? AND commit_sha = ?
                           ORDER BY additions + deletions DESC
                           LIMIT 10`,
                          [projectId, r.commit_sha],
                          function(fileErr, fileRows) {
                            if (fileErr) {
                              resolveFiles([]);
                            } else {
                              resolveFiles(fileRows.map(f => ({
                                path: f.file_path,
                                status: f.status,
                                additions: f.additions,
                                deletions: f.deletions
                              })));
                            }
                          }
                        );
                      });
                      
                      return {
                        sha: r.commit_sha,
                        message: r.commit_message,
                        author: r.author,
                        date: r.commit_date,
                        linesAdded: r.lines_added || 0,
                        linesDeleted: r.lines_deleted || 0,
                        filesChanged: r.files_changed || 0,
                        files: files
                      };
                    })
                  );
                  resolve(commitsWithFiles);
                }
              }
            );
          });
        }
        
        // 이슈 정보 수집
        let issues = [];
        if (includeIssues) {
          console.log('[AI Controller] taskSuggestion - 이슈 데이터 조회 중...');
          issues = await new Promise((resolve, reject) => {
            db.all(
              `SELECT issue_number, title, body, state, labels
               FROM project_issues
               WHERE project_id = ?
               ORDER BY created_at DESC
               LIMIT 20`,
              [projectId],
              function(err, rows) {
                if (err) {
                  console.error('[AI Controller] taskSuggestion - 이슈 조회 오류:', err);
                  resolve([]);
                } else {
                  console.log('[AI Controller] taskSuggestion - 이슈 조회 완료:', rows.length, '개');
                  resolve(rows.map(r => ({
                    number: r.issue_number,
                    title: r.title,
                    body: r.body ? r.body.substring(0, 200) : null,
                    state: r.state,
                    labels: r.labels ? JSON.parse(r.labels) : []
                  })));
                }
              }
            );
          });
        }
        
        // 현재 Task 목록 수집
        console.log('[AI Controller] taskSuggestion - Task 목록 조회 중...');
        const currentTasks = await new Promise((resolve, reject) => {
          db.all(
            `SELECT title, description, status
             FROM tasks
             WHERE project_id = ?
             ORDER BY created_at DESC`,
            [projectId],
            function(err, rows) {
              if (err) {
                console.error('[AI Controller] taskSuggestion - Task 조회 오류:', err);
                reject(err);
              } else {
                console.log('[AI Controller] taskSuggestion - Task 조회 완료:', rows.length, '개');
                resolve(rows);
              }
            }
          );
        });
        
        console.log('[AI Controller] taskSuggestion - 데이터 수집 완료:', {
          commits: commits.length,
          issues: issues.length,
          tasks: currentTasks.length
        });
        
        // AI 백엔드로 요청 전달
        console.log('[AI Controller] taskSuggestion - AI 백엔드로 요청 전송:', AI_BACKEND_URL);
        const aiResponse = await axios.post(
          `${AI_BACKEND_URL}/api/ai/task-suggestion`,
          {
            commits: commits,
            issues: issues,
            currentTasks: currentTasks,
            projectDescription: project.description || project.title,
            githubRepo: project.github_repo || null
          },
          {
            timeout: 360000 // 6분 타임아웃 (큰 모델의 경우 더 오래 걸릴 수 있음)
          }
        );
        
        console.log('[AI Controller] taskSuggestion - AI 백엔드 응답 수신:', {
          status: aiResponse.status,
          hasError: !!aiResponse.data.error,
          suggestionsCount: aiResponse.data.suggestions?.length || 0
        });
        
        // AI 백엔드 에러 응답 확인
        if (aiResponse.data.error) {
          throw new Error(aiResponse.data.error);
        }
        
        // AI 로그 저장
        const suggestions = aiResponse.data.suggestions || [];
        const analysis = aiResponse.data.analysis || null;
        
        db.run(
          `INSERT INTO ai_logs (user_id, project_id, type, input, output)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            projectId,
            'task_suggestion',
            JSON.stringify({ 
              commits: commits.length, 
              issues: issues.length,
              tasks: currentTasks.length 
            }),
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
            suggestions: suggestions,
            analysis: analysis
          },
          message: 'Task 제안이 생성되었습니다.'
        });
        
      } catch (error) {
        console.error('[AI Controller] taskSuggestion - 오류 발생:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
          request: !!error.request
        });
        
        // axios 에러 처리
        if (error.response) {
          // AI 백엔드가 에러 응답을 반환한 경우
          const errorData = error.response.data || {};
          console.error('[AI Controller] taskSuggestion - AI 백엔드 에러 응답:', errorData);
          return res.status(error.response.status || 500).json({ 
            success: false,
            error: { 
              code: 'AI_BACKEND_ERROR',
              message: errorData.error || errorData.message || 'AI 백엔드에서 오류가 발생했습니다.' 
            }
          });
        } else if (error.request) {
          // 요청은 보냈지만 응답을 받지 못한 경우
          console.error('[AI Controller] taskSuggestion - AI 백엔드 연결 실패 (요청은 전송됨)');
          return res.status(503).json({ 
            success: false,
            error: { 
              code: 'AI_BACKEND_UNAVAILABLE',
              message: 'AI 서비스에 연결할 수 없습니다. AI 백엔드가 실행 중인지 확인해주세요.' 
            }
          });
        } else {
          // 요청 설정 중 오류 발생
          console.error('[AI Controller] taskSuggestion - 요청 설정 오류');
          return res.status(500).json({ 
            success: false,
            error: { 
              code: 'AI_REQUEST_FAILED',
              message: error.message || 'AI 요청 처리 중 오류가 발생했습니다.' 
            }
          });
        }
      }
    }
  );
};

// 진행도 분석
exports.progressAnalysis = async function(req, res, next) {
  console.log('[AI Controller] progressAnalysis 요청 수신:', { 
    projectId: req.body.projectId,
    userId: req.user?.userId 
  });
  
  const { projectId } = req.body;
  const userId = req.user.userId;
  
  if (!projectId) {
    console.error('[AI Controller] progressAnalysis - projectId 없음');
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
        console.log('[AI Controller] progressAnalysis - 데이터 수집 시작');
        
        // 커밋 데이터 수집
        console.log('[AI Controller] progressAnalysis - 커밋 데이터 조회 중...');
        const commits = await new Promise((resolve, reject) => {
          db.all(
            `SELECT commit_sha, commit_message, author, commit_date, lines_added, lines_deleted, files_changed
             FROM project_commits
             WHERE project_id = ?
             ORDER BY commit_date DESC
             LIMIT 100`,
            [projectId],
            function(err, rows) {
              if (err) {
                console.error('[AI Controller] progressAnalysis - 커밋 조회 오류:', err);
                reject(err);
              } else {
                console.log('[AI Controller] progressAnalysis - 커밋 조회 완료:', rows.length, '개');
                resolve(rows.map(r => ({
                  sha: r.commit_sha,
                  message: r.commit_message,
                  author: r.author,
                  date: r.commit_date,
                  linesAdded: r.lines_added || 0,
                  linesDeleted: r.lines_deleted || 0,
                  filesChanged: r.files_changed || 0
                })));
              }
            }
          );
        });
        
        // Task 목록 수집
        console.log('[AI Controller] progressAnalysis - Task 목록 조회 중...');
        const tasks = await new Promise((resolve, reject) => {
          db.all(
            `SELECT id, title, description, status, due_date, created_at
             FROM tasks
             WHERE project_id = ?
             ORDER BY created_at DESC`,
            [projectId],
            function(err, rows) {
              if (err) {
                console.error('[AI Controller] progressAnalysis - Task 조회 오류:', err);
                reject(err);
              } else {
                console.log('[AI Controller] progressAnalysis - Task 조회 완료:', rows.length, '개');
                resolve(rows.map(t => ({
                  id: t.id,
                  title: t.title,
                  description: t.description,
                  status: t.status,
                  dueDate: t.due_date,
                  createdAt: t.created_at
                })));
              }
            }
          );
        });
        
        console.log('[AI Controller] progressAnalysis - 데이터 수집 완료:', {
          commits: commits.length,
          tasks: tasks.length
        });
        
        // AI 백엔드로 요청 전달
        console.log('[AI Controller] progressAnalysis - AI 백엔드로 요청 전송:', AI_BACKEND_URL);
        const aiResponse = await axios.post(
          `${AI_BACKEND_URL}/api/ai/progress-analysis`,
          {
            commits: commits,
            tasks: tasks,
            projectDescription: project.description || project.title,
            projectStartDate: project.created_at || null,
            projectDueDate: null  // 프로젝트에 마감일 필드가 없으면 null
          },
          {
            timeout: 120000
          }
        );
        
        console.log('[AI Controller] progressAnalysis - AI 백엔드 응답 수신:', {
          status: aiResponse.status,
          hasError: !!aiResponse.data.error,
          hasData: !!aiResponse.data
        });
        
        if (aiResponse.data.error) {
          throw new Error(aiResponse.data.error);
        }
        
        res.json({
          success: true,
          data: aiResponse.data,
          message: '진행도 분석이 완료되었습니다.'
        });
        
      } catch (error) {
        console.error('[AI Controller] progressAnalysis - 오류 발생:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
          request: !!error.request
        });
        
        if (error.response) {
          const errorData = error.response.data || {};
          return res.status(error.response.status || 500).json({ 
            success: false,
            error: { 
              code: 'AI_BACKEND_ERROR',
              message: errorData.error || errorData.message || 'AI 백엔드에서 오류가 발생했습니다.' 
            }
          });
        } else if (error.request) {
          return res.status(503).json({ 
            success: false,
            error: { 
              code: 'AI_BACKEND_UNAVAILABLE',
              message: 'AI 서비스에 연결할 수 없습니다.' 
            }
          });
        } else {
          return res.status(500).json({ 
            success: false,
            error: { 
              code: 'AI_REQUEST_FAILED',
              message: error.message || '진행도 분석 중 오류가 발생했습니다.' 
            }
          });
        }
      }
    }
  );
};

// Task 완료 여부 판단
exports.taskCompletionCheck = async function(req, res, next) {
  console.log('[AI Controller] taskCompletionCheck 요청 수신:', { 
    projectId: req.body.projectId,
    taskId: req.body.taskId,
    userId: req.user?.userId 
  });
  
  const { projectId, taskId } = req.body;
  const userId = req.user.userId;
  
  if (!projectId || !taskId) {
    console.error('[AI Controller] taskCompletionCheck - 필수 필드 없음:', { projectId, taskId });
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '프로젝트 ID와 Task ID가 필요합니다.' 
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
        console.log('[AI Controller] taskCompletionCheck - Task 정보 조회 중...');
        // Task 정보 조회
        const task = await new Promise((resolve, reject) => {
          db.get(
            `SELECT id, title, description, status
             FROM tasks
             WHERE id = ? AND project_id = ?`,
            [taskId, projectId],
            function(err, row) {
              if (err) {
                console.error('[AI Controller] taskCompletionCheck - Task 조회 오류:', err);
                reject(err);
              } else if (!row) {
                console.error('[AI Controller] taskCompletionCheck - Task를 찾을 수 없음');
                reject(new Error('Task를 찾을 수 없습니다.'));
              } else {
                console.log('[AI Controller] taskCompletionCheck - Task 조회 완료:', row.title);
                resolve({
                  id: row.id,
                  title: row.title,
                  description: row.description,
                  status: row.status
                });
              }
            }
          );
        });
        
        // 프로젝트의 최근 커밋들을 모두 조회 (AI가 관련성을 판단하도록)
        console.log('[AI Controller] taskCompletionCheck - 프로젝트 커밋 조회 중... (AI가 관련성 판단)');
        const commits = await new Promise((resolve, reject) => {
          db.all(
            `SELECT c.commit_sha, c.commit_message, c.author, c.commit_date, c.lines_added, c.lines_deleted, c.files_changed, c.task_id
             FROM project_commits c
             WHERE c.project_id = ?
             ORDER BY c.commit_date DESC
             LIMIT 100`,
            [projectId],
            async function(err, rows) {
              if (err) {
                console.error('[AI Controller] taskCompletionCheck - 커밋 조회 오류:', err);
                reject(err);
              } else {
                console.log('[AI Controller] taskCompletionCheck - 관련 커밋 조회 완료:', rows.length, '개');
                // 각 커밋의 파일 변경 정보도 수집
                const commitsWithFiles = await Promise.all(
                  rows.map(async (r) => {
                    const files = await new Promise((resolveFiles) => {
                      db.all(
                        `SELECT file_path, status, additions, deletions
                         FROM project_commit_files
                         WHERE project_id = ? AND commit_sha = ?
                         ORDER BY additions + deletions DESC
                         LIMIT 10`,
                        [projectId, r.commit_sha],
                        function(fileErr, fileRows) {
                          if (fileErr) {
                            resolveFiles([]);
                          } else {
                            resolveFiles(fileRows.map(f => ({
                              path: f.file_path,
                              status: f.status,
                              additions: f.additions,
                              deletions: f.deletions
                            })));
                          }
                        }
                      );
                    });
                    
                    return {
                      sha: r.commit_sha,
                      message: r.commit_message,
                      author: r.author,
                      date: r.commit_date,
                      linesAdded: r.lines_added || 0,
                      linesDeleted: r.lines_deleted || 0,
                      filesChanged: r.files_changed || 0,
                      files: files
                    };
                  })
                );
                resolve(commitsWithFiles);
              }
            }
          );
        });
        
        console.log('[AI Controller] taskCompletionCheck - 데이터 수집 완료:', {
          task: task.title,
          commits: commits.length
        });
        
        // AI 백엔드로 요청 전달
        console.log('[AI Controller] taskCompletionCheck - AI 백엔드로 요청 전송:', AI_BACKEND_URL);
        const aiResponse = await axios.post(
          `${AI_BACKEND_URL}/api/ai/task-completion-check`,
          {
            task: task,
            commits: commits,
            projectDescription: project.description || project.title
          },
          {
            timeout: 120000
          }
        );
        
        console.log('[AI Controller] taskCompletionCheck - AI 백엔드 응답 수신:', {
          status: aiResponse.status,
          hasError: !!aiResponse.data.error,
          hasData: !!aiResponse.data
        });
        
        if (aiResponse.data.error) {
          throw new Error(aiResponse.data.error);
        }
        
        res.json({
          success: true,
          data: aiResponse.data,
          message: 'Task 완료 여부 분석이 완료되었습니다.'
        });
        
      } catch (error) {
        console.error('[AI Controller] taskCompletionCheck - 오류 발생:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
          request: !!error.request
        });
        
        if (error.response) {
          const errorData = error.response.data || {};
          return res.status(error.response.status || 500).json({ 
            success: false,
            error: { 
              code: 'AI_BACKEND_ERROR',
              message: errorData.error || errorData.message || 'AI 백엔드에서 오류가 발생했습니다.' 
            }
          });
        } else if (error.request) {
          return res.status(503).json({ 
            success: false,
            error: { 
              code: 'AI_BACKEND_UNAVAILABLE',
              message: 'AI 서비스에 연결할 수 없습니다.' 
            }
          });
        } else {
          return res.status(500).json({ 
            success: false,
            error: { 
              code: 'AI_REQUEST_FAILED',
              message: error.message || 'Task 완료 여부 판단 중 오류가 발생했습니다.' 
            }
          });
        }
      }
    }
  );
};

