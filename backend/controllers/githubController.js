var GitHubService = require('../services/githubService');
var progressAnalyzer = require('../services/progressAnalyzer');
var { db } = require('../database/db');

// ISO 8601 날짜를 MySQL DATETIME 형식으로 변환
function convertToMySQLDateTime(isoDateString) {
  if (!isoDateString) return null;
  // '2025-11-03T00:05:03Z' -> '2025-11-03 00:05:03'
  return isoDateString.replace('T', ' ').replace('Z', '').substring(0, 19);
}

// 프로젝트 GitHub 정보 동기화
exports.sync = async function(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  try {
    // 프로젝트 조회
    db.get(
      'SELECT * FROM projects WHERE id = ? AND (owner_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = ?))',
      [projectId, userId, userId],
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
          return res.status(404).json({ 
            success: false,
            error: { 
              code: 'PROJECT_NOT_FOUND',
              message: '프로젝트를 찾을 수 없거나 권한이 없습니다.' 
            }
          });
        }

        if (!project.github_repo) {
          return res.status(400).json({ 
            success: false,
            error: { 
              code: 'GITHUB_REPO_NOT_CONNECTED',
              message: 'GitHub 저장소가 연결되지 않았습니다.' 
            }
          });
        }

        // 토큰 상태 확인 및 로깅
        const token = project.github_token;
        console.log(`[동기화] 프로젝트 ${projectId} 토큰 상태:`, {
          hasToken: !!token,
          tokenLength: token ? token.length : 0,
          tokenPrefix: token ? token.substring(0, 10) + '...' : '없음',
          repo: project.github_repo
        });

        // GitHubService 생성 (프로젝트에 저장된 토큰 사용)
        const githubService = new GitHubService(token);

        try {
          // 커밋 정보 가져오기 (모든 커밋 가져오기)
          let commits = [];
          try {
            commits = await githubService.getCommits(project.github_repo, { perPage: 100, maxCommits: null });
            console.log(`[동기화] GitHub에서 커밋 ${commits.length}개 가져옴`);
          } catch (error) {
            console.error('[동기화] 커밋 목록 가져오기 실패:', error.message);
            commits = []; // 빈 배열로 설정하여 계속 진행
          }
          
          // 커밋 정보를 DB에 저장 (통계 정보 포함)
          if (commits.length > 0) {
            console.log(`[동기화] 커밋 ${commits.length}개 저장 시작`);
            
            // Promise 배열로 변환하여 모든 저장이 완료될 때까지 기다림
            const commitSavePromises = commits.map(async (commit) => {
              // 커밋 상세 통계 정보 가져오기
              let stats = null;
              try {
                console.log(`[동기화] 커밋 ${commit.sha.substring(0, 7)} 통계 정보 가져오기 시작`);
                stats = await githubService.getCommitStats(project.github_repo, commit.sha);
                console.log(`[동기화] 커밋 ${commit.sha.substring(0, 7)} 통계 가져오기 성공:`, {
                  linesAdded: stats.linesAdded,
                  linesDeleted: stats.linesDeleted,
                  filesChanged: stats.filesChanged
                });
              } catch (error) {
                // 통계 정보 가져오기 실패해도 기본 정보는 저장
                console.warn(`[동기화] 커밋 ${commit.sha.substring(0, 7)} 통계 정보 가져오기 실패:`, error.message);
              }
              
              const valuesToSave = [
                projectId,
                commit.sha,
                commit.message,
                commit.author,
                convertToMySQLDateTime(commit.date), // ISO 8601 -> MySQL DATETIME
                stats ? stats.linesAdded : null,
                stats ? stats.linesDeleted : null,
                stats ? stats.filesChanged : null
              ];
              
              // DB 저장을 Promise로 감싸기
              return new Promise((resolve, reject) => {
                db.run(
                  `INSERT INTO project_commits 
                   (project_id, commit_sha, commit_message, author, commit_date, lines_added, lines_deleted, files_changed)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE
                   commit_message = VALUES(commit_message),
                   author = VALUES(author),
                   commit_date = VALUES(commit_date),
                   lines_added = IF(VALUES(lines_added) IS NOT NULL, VALUES(lines_added), lines_added),
                   lines_deleted = IF(VALUES(lines_deleted) IS NOT NULL, VALUES(lines_deleted), lines_deleted),
                   files_changed = IF(VALUES(files_changed) IS NOT NULL, VALUES(files_changed), files_changed)`,
                  valuesToSave,
                  (err) => {
                    if (err) {
                      console.error(`[동기화] 커밋 ${commit.sha.substring(0, 7)} 저장 오류:`, err);
                      reject(err);
                    } else {
                      const savedStats = stats ? ` (통계: +${stats.linesAdded}/-${stats.linesDeleted}, 파일: ${stats.filesChanged})` : ' (통계 없음)';
                      console.log(`[동기화] 커밋 ${commit.sha.substring(0, 7)} 저장 완료${savedStats}`);
                      
                      // 파일별 변경 내용 저장 (비동기, 완료를 기다리지 않음)
                      if (stats && stats.files && stats.files.length > 0) {
                        console.log(`[동기화] 커밋 ${commit.sha.substring(0, 7)}의 파일 ${stats.files.length}개 저장 시작`);
                        stats.files.forEach((file) => {
                          db.run(
                            `INSERT INTO project_commit_files 
                             (project_id, commit_sha, file_path, status, additions, deletions, patch)
                             VALUES (?, ?, ?, ?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE
                             status = VALUES(status),
                             additions = VALUES(additions),
                             deletions = VALUES(deletions),
                             patch = VALUES(patch)`,
                            [
                              projectId,
                              commit.sha,
                              file.filename,
                              file.status || 'modified',
                              file.additions || 0,
                              file.deletions || 0,
                              file.patch || null
                            ],
                            (fileErr) => {
                              if (fileErr) {
                                console.error(`[동기화] 파일 ${file.filename} 저장 오류:`, fileErr);
                              } else {
                                console.log(`[동기화] 파일 ${file.filename} 저장 완료 (${file.status}, +${file.additions}/-${file.deletions})`);
                              }
                            }
                          );
                        });
                      }
                      
                      resolve();
                    }
                  }
                );
              });
            });
            
            // 모든 커밋 저장이 완료될 때까지 기다림
            try {
              await Promise.all(commitSavePromises);
              console.log(`[동기화] 커밋 ${commits.length}개 저장 완료`);
            } catch (error) {
              console.error(`[동기화] 일부 커밋 저장 실패:`, error.message);
              // 일부 실패해도 계속 진행
            }
          } else {
            console.warn(`[동기화] 저장할 커밋이 없습니다.`);
          }

          // 이슈 정보 가져오기
          let issues = [];
          try {
            issues = await githubService.getIssues(project.github_repo, { state: 'all', perPage: 100 });
            
            // 이슈 정보를 DB에 저장
            for (const issue of issues) {
              db.run(
                `INSERT INTO project_issues 
                 (project_id, issue_number, title, body, state, assignees, labels, created_at, updated_at, closed_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 title = VALUES(title),
                 body = VALUES(body),
                 state = VALUES(state),
                 assignees = VALUES(assignees),
                 labels = VALUES(labels),
                 updated_at = VALUES(updated_at),
                 closed_at = VALUES(closed_at),
                 synced_at = CURRENT_TIMESTAMP`,
                [
                  projectId,
                  issue.number,
                  issue.title,
                  issue.body,
                  issue.state,
                  JSON.stringify(issue.assignees || []),
                  JSON.stringify(issue.labels || []),
                  convertToMySQLDateTime(issue.createdAt),
                  convertToMySQLDateTime(issue.updatedAt),
                  convertToMySQLDateTime(issue.closedAt)
                ],
                function(err) {
                  if (err) {
                    console.error('이슈 저장 오류:', err);
                  }
                }
              );
            }
          } catch (error) {
            console.error('이슈 조회 실패:', error.message);
          }

          // 브랜치 정보 가져오기 및 DB에 저장
          let branches = [];
          try {
            branches = await githubService.getBranches(project.github_repo);
            
            // 브랜치 정보를 DB에 저장
            for (const branch of branches) {
              db.run(
                `INSERT INTO project_branches 
                 (project_id, branch_name, commit_sha, is_protected, is_default)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 commit_sha = VALUES(commit_sha),
                 is_protected = VALUES(is_protected),
                 is_default = VALUES(is_default),
                 synced_at = CURRENT_TIMESTAMP`,
                [
                  projectId,
                  branch.name,
                  branch.sha,
                  branch.protected ? 1 : 0,
                  branch.isDefault ? 1 : 0
                ],
                function(err) {
                  if (err) {
                    console.error('브랜치 저장 오류:', err);
                  }
                }
              );
            }
          } catch (error) {
            console.error('브랜치 조회 실패:', error.message);
          }

          // projects 테이블의 github_last_synced_at 업데이트
          db.run(
            'UPDATE projects SET github_last_synced_at = CURRENT_TIMESTAMP WHERE id = ?',
            [projectId],
            function(err) {
              if (err) {
                console.error('동기화 시간 업데이트 오류:', err);
              }
            }
          );

          // 진행도 분석
          const progress = await progressAnalyzer.getProjectProgress(projectId);

          console.log(`[동기화] 동기화 완료 - 커밋: ${commits.length}개, 이슈: ${issues.length}개, 브랜치: ${branches.length}개`);

          res.json({
            success: true,
            data: {
              message: '동기화가 완료되었습니다.',
              syncResult: {
                commitsSynced: commits.length,
                issuesFound: issues.length,
                branchesFound: branches.length,
                progress
              }
            }
          });
        } catch (error) {
          console.error('GitHub 동기화 오류:', error);
          res.status(500).json({ 
            success: false,
            error: { 
              code: 'SYNC_FAILED',
              message: `동기화 실패: ${error.message}` 
            }
          });
        }
      }
    );
  } catch (error) {
    console.error('동기화 오류:', error);
    res.status(500).json({ 
      success: false,
      error: { 
        code: 'SERVER_ERROR',
        message: '서버 오류가 발생했습니다.' 
      }
    });
  }
};

// 커밋 목록 조회
exports.getCommits = function(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.userId;
  const { limit = 10, offset = 0 } = req.query;

  db.get(
    'SELECT * FROM projects WHERE id = ? AND (owner_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = ?))',
    [projectId, userId, userId],
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

      // 전체 개수 조회
      db.get(
        'SELECT COUNT(*) as total FROM project_commits WHERE project_id = ?',
        [projectId],
        function(err, countResult) {
          if (err) {
            console.error('커밋 개수 조회 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }

          console.log('[getCommits] COUNT 쿼리 결과:', countResult);
          let total = 0;
          if (countResult) {
            total = countResult.total !== undefined ? Number(countResult.total) : 
                     (countResult[Object.keys(countResult)[0]] !== undefined ? Number(countResult[Object.keys(countResult)[0]]) : 0);
          }
          console.log(`[getCommits] 전체 커밋 개수: ${total} (원본: ${JSON.stringify(countResult)}), limit: ${limit}, offset: ${offset}`);

          // 페이지네이션 적용하여 커밋 조회
          db.all(
            'SELECT * FROM project_commits WHERE project_id = ? ORDER BY commit_date DESC LIMIT ? OFFSET ?',
            [projectId, parseInt(limit), parseInt(offset)],
            function(err, commits) {
          if (err) {
            console.error('커밋 목록 조회 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }

          console.log(`[조회] 프로젝트 ${projectId}의 커밋 조회 결과:`, {
            total: total,
            currentPageItems: commits ? commits.length : 0,
            hasCommits: commits && commits.length > 0
          });

          // 만약 total이 0인데 실제 데이터가 있으면, 실제 데이터 개수로 대체
          if (total === 0 && commits && commits.length > 0) {
            db.get('SELECT COUNT(*) as total FROM project_commits WHERE project_id = ?', [projectId], function(err2, allCountResult) {
              if (!err2 && allCountResult) {
                total = allCountResult.total !== undefined ? Number(allCountResult.total) : 
                         (allCountResult[Object.keys(allCountResult)[0]] !== undefined ? Number(allCountResult[Object.keys(allCountResult)[0]]) : commits.length);
                console.log(`[getCommits] 재계산된 전체 개수: ${total}`);
              } else {
                total = commits.length;
              }
              
              res.json({ 
                success: true,
                data: { 
                  commits: commits || [],
                  total: total,
                  limit: parseInt(limit),
                  offset: parseInt(offset)
                }
              });
            });
          } else {
            res.json({ 
              success: true,
              data: { 
                commits: commits || [],
                total: total,
                limit: parseInt(limit),
                offset: parseInt(offset)
              }
            });
          }
            }
          );
        }
      );
    }
  );
};

// 이슈 목록 조회 (DB에 저장된 데이터)
exports.getIssues = function(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.userId;
  const { state, limit = 50, offset = 0 } = req.query;

  db.get(
    'SELECT * FROM projects WHERE id = ? AND (owner_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = ?))',
    [projectId, userId, userId],
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

      // 전체 개수 조회
      let countQuery = 'SELECT COUNT(*) as total FROM project_issues WHERE project_id = ?';
      let countParams = [projectId];
      
      if (state && state !== 'all') {
        countQuery += ' AND state = ?';
        countParams.push(state);
      }

      db.get(countQuery, countParams, function(err, countResult) {
        if (err) {
          console.error('이슈 개수 조회 오류:', err);
          return res.status(500).json({ 
            success: false,
            error: { 
              code: 'SERVER_ERROR',
              message: '서버 오류가 발생했습니다.' 
            }
          });
        }

        console.log('[getIssues] COUNT 쿼리 결과:', countResult);
        // SQLite의 COUNT(*) 결과는 { total: 숫자 } 형태로 반환됨
        let total = 0;
        if (countResult) {
          // total 키가 있으면 사용, 없으면 첫 번째 값 사용
          total = countResult.total !== undefined ? Number(countResult.total) : 
                   (countResult[Object.keys(countResult)[0]] !== undefined ? Number(countResult[Object.keys(countResult)[0]]) : 0);
        }
        console.log(`[getIssues] 전체 이슈 개수: ${total} (원본: ${JSON.stringify(countResult)}), limit: ${limit}, offset: ${offset}`);

        // DB에서 이슈 조회
        let query = 'SELECT * FROM project_issues WHERE project_id = ?';
        let params = [projectId];
        
        if (state && state !== 'all') {
          query += ' AND state = ?';
          params.push(state);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        db.all(query, params, function(err, issues) {
          if (err) {
            console.error('이슈 목록 조회 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }

          console.log(`[getIssues] 현재 페이지 이슈 개수: ${issues ? issues.length : 0}`);
          
          // 만약 total이 0인데 실제 데이터가 있으면, 실제 데이터 개수로 대체
          if (total === 0 && issues && issues.length > 0) {
            // 전체 개수를 다시 조회 (LIMIT 없이)
            let allQuery = 'SELECT COUNT(*) as total FROM project_issues WHERE project_id = ?';
            let allParams = [projectId];
            if (state && state !== 'all') {
              allQuery += ' AND state = ?';
              allParams.push(state);
            }
            db.get(allQuery, allParams, function(err2, allCountResult) {
              if (!err2 && allCountResult) {
                total = allCountResult.total !== undefined ? Number(allCountResult.total) : 
                         (allCountResult[Object.keys(allCountResult)[0]] !== undefined ? Number(allCountResult[Object.keys(allCountResult)[0]]) : issues.length);
                console.log(`[getIssues] 재계산된 전체 개수: ${total}`);
              } else {
                total = issues.length; // 최소한 현재 페이지 개수라도 표시
              }
              
              res.json({ 
                success: true,
                data: { 
                  issues: (issues || []).map(issue => ({
                    number: issue.issue_number,
                    title: issue.title,
                    body: issue.body,
                    state: issue.state,
                    assignees: issue.assignees ? JSON.parse(issue.assignees) : [],
                    labels: issue.labels ? JSON.parse(issue.labels) : [],
                    createdAt: issue.created_at,
                    updatedAt: issue.updated_at,
                    closedAt: issue.closed_at
                  })),
                  total: total,
                  limit: parseInt(limit),
                  offset: parseInt(offset)
                }
              });
            });
          } else {
            res.json({ 
              success: true,
              data: { 
                issues: (issues || []).map(issue => ({
                  number: issue.issue_number,
                  title: issue.title,
                  body: issue.body,
                  state: issue.state,
                  assignees: issue.assignees ? JSON.parse(issue.assignees) : [],
                  labels: issue.labels ? JSON.parse(issue.labels) : [],
                  createdAt: issue.created_at,
                  updatedAt: issue.updated_at,
                  closedAt: issue.closed_at
                })),
                total: total,
                limit: parseInt(limit),
                offset: parseInt(offset)
              }
            });
          }
        });
      });
    }
  );
};

// 이슈 상세 조회 (DB에 저장된 데이터)
exports.getIssue = function(req, res, next) {
  const { projectId, issueNumber } = req.params;
  const userId = req.user.userId;

  db.get(
    'SELECT * FROM projects WHERE id = ? AND (owner_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = ?))',
    [projectId, userId, userId],
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

      // DB에서 이슈 조회
      db.get(
        'SELECT * FROM project_issues WHERE project_id = ? AND issue_number = ?',
        [projectId, issueNumber],
        function(err, issue) {
          if (err) {
            console.error('이슈 상세 조회 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }

          if (!issue) {
            return res.status(404).json({ 
              success: false,
              error: { 
                code: 'ISSUE_NOT_FOUND',
                message: '이슈를 찾을 수 없습니다.' 
              }
            });
          }

          res.json({ 
            success: true,
            data: { 
              issue: {
                number: issue.issue_number,
                title: issue.title,
                body: issue.body,
                state: issue.state,
                assignees: issue.assignees ? JSON.parse(issue.assignees) : [],
                labels: issue.labels ? JSON.parse(issue.labels) : [],
                createdAt: issue.created_at,
                updatedAt: issue.updated_at,
                closedAt: issue.closed_at
              }
            }
          });
        }
      );
    }
  );
};

// 브랜치 목록 조회 (DB에 저장된 데이터)
exports.getBranches = function(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.userId;
  const { limit = 10, offset = 0 } = req.query;

  db.get(
    'SELECT * FROM projects WHERE id = ? AND (owner_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = ?))',
    [projectId, userId, userId],
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

      // 전체 개수 조회
      db.get(
        'SELECT COUNT(*) as total FROM project_branches WHERE project_id = ?',
        [projectId],
        function(err, countResult) {
          if (err) {
            console.error('브랜치 개수 조회 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }

          console.log('[getBranches] COUNT 쿼리 결과:', countResult);
          let total = 0;
          if (countResult) {
            total = countResult.total !== undefined ? Number(countResult.total) : 
                     (countResult[Object.keys(countResult)[0]] !== undefined ? Number(countResult[Object.keys(countResult)[0]]) : 0);
          }
          console.log(`[getBranches] 전체 브랜치 개수: ${total} (원본: ${JSON.stringify(countResult)}), limit: ${limit}, offset: ${offset}`);

          // 페이지네이션 적용하여 브랜치 조회
          db.all(
            'SELECT * FROM project_branches WHERE project_id = ? ORDER BY is_default DESC, branch_name ASC LIMIT ? OFFSET ?',
            [projectId, parseInt(limit), parseInt(offset)],
            function(err, branches) {
          if (err) {
            console.error('브랜치 목록 조회 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }

          console.log(`[getBranches] 현재 페이지 브랜치 개수: ${branches ? branches.length : 0}`);
          
          // 만약 total이 0인데 실제 데이터가 있으면, 실제 데이터 개수로 대체
          if (total === 0 && branches && branches.length > 0) {
            db.get('SELECT COUNT(*) as total FROM project_branches WHERE project_id = ?', [projectId], function(err2, allCountResult) {
              if (!err2 && allCountResult) {
                total = allCountResult.total !== undefined ? Number(allCountResult.total) : 
                         (allCountResult[Object.keys(allCountResult)[0]] !== undefined ? Number(allCountResult[Object.keys(allCountResult)[0]]) : branches.length);
                console.log(`[getBranches] 재계산된 전체 개수: ${total}`);
              } else {
                total = branches.length;
              }
              
              res.json({ 
                success: true,
                data: { 
                  branches: (branches || []).map(branch => ({
                    name: branch.branch_name,
                    sha: branch.commit_sha,
                    protected: branch.is_protected === 1,
                    isDefault: branch.is_default === 1
                  })),
                  total: total,
                  limit: parseInt(limit),
                  offset: parseInt(offset)
                }
              });
            });
          } else {
            res.json({ 
              success: true,
              data: { 
                branches: (branches || []).map(branch => ({
                  name: branch.branch_name,
                  sha: branch.commit_sha,
                  protected: branch.is_protected === 1,
                  isDefault: branch.is_default === 1
                })),
                total: total,
                limit: parseInt(limit),
                offset: parseInt(offset)
              }
            });
          }
            }
          );
        }
      );
    }
  );
};

// 브랜치 상세 조회 (DB에 저장된 데이터)
exports.getBranch = function(req, res, next) {
  const { projectId, branchName } = req.params;
  const userId = req.user.userId;

  db.get(
    'SELECT * FROM projects WHERE id = ? AND (owner_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = ?))',
    [projectId, userId, userId],
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

      // DB에서 브랜치 조회
      db.get(
        'SELECT * FROM project_branches WHERE project_id = ? AND branch_name = ?',
        [projectId, branchName],
        function(err, branch) {
          if (err) {
            console.error('브랜치 상세 조회 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }

          if (!branch) {
            return res.status(404).json({ 
              success: false,
              error: { 
                code: 'BRANCH_NOT_FOUND',
                message: '브랜치를 찾을 수 없습니다.' 
              }
            });
          }

          // 해당 브랜치의 최신 커밋 정보도 함께 조회 (선택적)
          db.get(
            'SELECT * FROM project_commits WHERE project_id = ? AND commit_sha = ?',
            [projectId, branch.commit_sha],
            function(err, commit) {
              if (err) {
                console.error('커밋 조회 오류:', err);
                // 커밋 정보는 없어도 브랜치 정보는 반환
              }

              res.json({ 
                success: true,
                data: { 
                  branch: {
                    name: branch.branch_name,
                    sha: branch.commit_sha,
                    protected: branch.is_protected === 1,
                    isDefault: branch.is_default === 1,
                    syncedAt: branch.synced_at,
                    latestCommit: commit ? {
                      sha: commit.commit_sha,
                      message: commit.commit_message,
                      author: commit.author,
                      date: commit.commit_date
                    } : null
                  }
                }
              });
            }
          );
        }
      );
    }
  );
};

// 커밋 상세 조회 (DB에 저장된 데이터)
exports.getCommit = function(req, res, next) {
  const { projectId, commitSha } = req.params;
  const userId = req.user.userId;

  db.get(
    'SELECT * FROM projects WHERE id = ? AND (owner_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = ?))',
    [projectId, userId, userId],
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

      // DB에서 커밋 조회
      db.get(
        'SELECT * FROM project_commits WHERE project_id = ? AND commit_sha = ?',
        [projectId, commitSha],
        function(err, commit) {
          if (err) {
            console.error('커밋 상세 조회 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }

          if (!commit) {
            return res.status(404).json({ 
              success: false,
              error: { 
                code: 'COMMIT_NOT_FOUND',
                message: '커밋을 찾을 수 없습니다.' 
              }
            });
          }

          // 해당 커밋의 파일 변경 목록 조회
          db.all(
            'SELECT * FROM project_commit_files WHERE project_id = ? AND commit_sha = ? ORDER BY file_path ASC',
            [projectId, commitSha],
            function(fileErr, files) {
              if (fileErr) {
                console.error('커밋 파일 목록 조회 오류:', fileErr);
                files = [];
              }

              res.json({ 
                success: true,
                data: { 
                  commit: {
                    sha: commit.commit_sha,
                    message: commit.commit_message,
                    author: commit.author,
                    date: commit.commit_date,
                    linesAdded: commit.lines_added,
                    linesDeleted: commit.lines_deleted,
                    filesChanged: commit.files_changed,
                    files: (files || []).map(file => ({
                      filePath: file.file_path,
                      status: file.status,
                      additions: file.additions,
                      deletions: file.deletions,
                      patch: file.patch
                    }))
                  }
                }
              });
            }
          );
        }
      );
    }
  );
};

