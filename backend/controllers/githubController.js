var GitHubService = require('../services/githubService');
var progressAnalyzer = require('../services/progressAnalyzer');
var { db } = require('../database/db');

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

        // GitHubService 생성 (토큰 없이 공개 저장소만 조회)
        const githubService = new GitHubService();

        try {
          // 커밋 정보 가져오기 (기본 정보만, 상세 정보는 제외)
          const commits = await githubService.getCommits(project.github_repo, { perPage: 100 });
          
          // 커밋 기본 정보만 DB에 저장 (상세 정보는 제외)
          for (const commit of commits) {
            db.run(
              `INSERT IGNORE INTO project_commits 
               (project_id, commit_sha, commit_message, author, commit_date, lines_added, lines_deleted, files_changed)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                projectId,
                commit.sha,
                commit.message,
                commit.author,
                commit.date,
                null, // lines_added (상세 정보 없음)
                null, // lines_deleted (상세 정보 없음)
                null  // files_changed (상세 정보 없음)
              ],
              function(err) {
                if (err && !err.message.includes('UNIQUE')) {
                  console.error('커밋 저장 오류:', err);
                }
              }
            );
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
                  issue.createdAt,
                  issue.updatedAt,
                  issue.closedAt || null
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

      db.all(
        'SELECT * FROM project_commits WHERE project_id = ? ORDER BY commit_date DESC LIMIT 50',
        [projectId],
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

          res.json({ 
            success: true,
            data: { 
              commits: commits || [] 
            }
          });
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
            }))
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
      db.all(
        'SELECT * FROM project_branches WHERE project_id = ? ORDER BY is_default DESC, branch_name ASC',
        [projectId],
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

          res.json({ 
            success: true,
            data: { 
              branches: (branches || []).map(branch => ({
                name: branch.branch_name,
                sha: branch.commit_sha,
                protected: branch.is_protected === 1,
                isDefault: branch.is_default === 1
              }))
            }
          });
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
                filesChanged: commit.files_changed
              }
            }
          });
        }
      );
    }
  );
};

