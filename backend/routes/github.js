var express = require('express');
var GitHubService = require('../services/githubService');
var progressAnalyzer = require('../services/progressAnalyzer');
var { db } = require('../database/init');
var { authenticateToken } = require('../middleware/auth');

var router = express.Router();

// 프로젝트 GitHub 정보 동기화
router.post('/sync/:projectId', authenticateToken, async function(req, res, next) {
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
          return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }

        if (!project) {
          return res.status(404).json({ error: '프로젝트를 찾을 수 없거나 권한이 없습니다.' });
        }

        if (!project.github_repo) {
          return res.status(400).json({ error: 'GitHub 저장소가 연결되지 않았습니다.' });
        }

        // 토큰 복호화
        let token = null;
        if (project.github_token) {
          token = Buffer.from(project.github_token, 'base64').toString();
        }

        const githubService = new GitHubService(token);

        try {
          // 커밋 정보 가져오기
          const commits = await githubService.getCommits(project.github_repo, { perPage: 100 });
          
          // 커밋 상세 정보 가져오기 (최근 30개만)
          const recentCommits = commits.slice(0, 30);
          const commitDetails = [];
          
          for (const commit of recentCommits) {
            try {
              const detail = await githubService.getCommitStats(project.github_repo, commit.sha);
              commitDetails.push(detail);
              
              // DB에 저장 (중복 체크)
              db.run(
                `INSERT IGNORE INTO project_commits 
                 (project_id, commit_sha, commit_message, author, commit_date, lines_added, lines_deleted, files_changed)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  projectId,
                  detail.sha,
                  detail.message,
                  detail.author,
                  detail.date,
                  detail.linesAdded,
                  detail.linesDeleted,
                  detail.filesChanged
                ],
                function(err) {
                  if (err && !err.message.includes('UNIQUE')) {
                    console.error('커밋 저장 오류:', err);
                  }
                }
              );
            } catch (error) {
              console.error(`커밋 ${commit.sha} 상세 조회 실패:`, error.message);
            }
          }

          // 이슈 정보 가져오기
          let issues = [];
          try {
            issues = await githubService.getIssues(project.github_repo, { state: 'all', perPage: 100 });
            
            // 이슈가 닫혔으면 연결된 Task 완료 처리
            for (const issue of issues) {
              if (issue.state === 'closed' && issue.closedAt) {
                db.run(
                  'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ? AND github_issue_number = ? AND status != ?',
                  ['done', projectId, issue.number, 'done'],
                  function(err) {
                    if (err) {
                      console.error('Task 상태 업데이트 오류:', err);
                    }
                  }
                );
              }
            }
          } catch (error) {
            console.error('이슈 조회 실패:', error.message);
          }

          // 브랜치 정보 가져오기
          let branches = [];
          try {
            branches = await githubService.getBranches(project.github_repo);
          } catch (error) {
            console.error('브랜치 조회 실패:', error.message);
          }

          // 진행도 분석
          const progress = await progressAnalyzer.getProjectProgress(projectId);

          res.json({
            message: '동기화가 완료되었습니다.',
            syncResult: {
              commitsSynced: commitDetails.length,
              issuesFound: issues.length,
              branchesFound: branches.length,
              progress
            }
          });
        } catch (error) {
          console.error('GitHub 동기화 오류:', error);
          res.status(500).json({ error: `동기화 실패: ${error.message}` });
        }
      }
    );
  } catch (error) {
    console.error('동기화 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 커밋 목록 조회
router.get('/commits/:projectId', authenticateToken, function(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.userId;

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

      db.all(
        'SELECT * FROM project_commits WHERE project_id = ? ORDER BY commit_date DESC LIMIT 50',
        [projectId],
        function(err, commits) {
          if (err) {
            console.error('커밋 목록 조회 오류:', err);
            return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
          }

          res.json({ commits: commits || [] });
        }
      );
    }
  );
});

// 이슈 목록 조회 (실시간 GitHub API 호출)
router.get('/issues/:projectId', authenticateToken, async function(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  db.get(
    'SELECT * FROM projects WHERE id = ? AND (user_id = ? OR EXISTS (SELECT 1 FROM team_users tu WHERE tu.team_id = projects.team_id AND tu.user_id = ?))',
    [projectId, userId, userId],
    async function(err, project) {
      if (err) {
        console.error('프로젝트 조회 오류:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }

      if (!project) {
        return res.status(404).json({ error: '프로젝트를 찾을 수 없거나 권한이 없습니다.' });
      }

      if (!project.github_repo) {
        return res.status(400).json({ error: 'GitHub 저장소가 연결되지 않았습니다.' });
      }

      try {
        let token = null;
        if (project.github_token) {
          token = Buffer.from(project.github_token, 'base64').toString();
        }

        const githubService = new GitHubService(token);
        const issues = await githubService.getIssues(project.github_repo, { state: 'all' });

        res.json({ issues });
      } catch (error) {
        console.error('이슈 조회 오류:', error);
        res.status(500).json({ error: `이슈 조회 실패: ${error.message}` });
      }
    }
  );
});

// 브랜치 목록 조회 (실시간 GitHub API 호출)
router.get('/branches/:projectId', authenticateToken, async function(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  db.get(
    'SELECT * FROM projects WHERE id = ? AND (user_id = ? OR EXISTS (SELECT 1 FROM team_users tu WHERE tu.team_id = projects.team_id AND tu.user_id = ?))',
    [projectId, userId, userId],
    async function(err, project) {
      if (err) {
        console.error('프로젝트 조회 오류:', err);
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }

      if (!project) {
        return res.status(404).json({ error: '프로젝트를 찾을 수 없거나 권한이 없습니다.' });
      }

      if (!project.github_repo) {
        return res.status(400).json({ error: 'GitHub 저장소가 연결되지 않았습니다.' });
      }

      try {
        let token = null;
        if (project.github_token) {
          token = Buffer.from(project.github_token, 'base64').toString();
        }

        const githubService = new GitHubService(token);
        const branches = await githubService.getBranches(project.github_repo);

        res.json({ branches });
      } catch (error) {
        console.error('브랜치 조회 오류:', error);
        res.status(500).json({ error: `브랜치 조회 실패: ${error.message}` });
      }
    }
  );
});

module.exports = router;

