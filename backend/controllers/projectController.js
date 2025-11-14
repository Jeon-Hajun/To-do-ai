var bcrypt = require('bcryptjs');
var { db } = require('../database/db');
var GitHubService = require('../services/githubService');
var { 
  validateProjectTitle, 
  validateProjectDescription, 
  validateGitHubUrl, 
  validateProjectPassword,
  validateProjectCode,
  validateId
} = require('../utils/validators');

// ISO 8601 날짜를 MySQL DATETIME 형식으로 변환
function convertToMySQLDateTime(isoDateString) {
  if (!isoDateString) return null;
  // '2025-11-03T00:05:03Z' -> '2025-11-03 00:05:03'
  return isoDateString.replace('T', ' ').replace('Z', '').substring(0, 19);
}

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
exports.create = async function(req, res) {
  const { title, description, isShared, password, githubRepo } = req.body;
  const userId = req.user.userId;

  // 입력 검증
  if (!validateProjectTitle(title).valid) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '제목이 올바르지 않습니다.' } });
  }
  
  // GitHub URL 검증 (선택 사항)
  if (githubRepo && !validateGitHubUrl(githubRepo).valid) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'GitHub URL이 올바르지 않습니다.' } });
  }
  
  if (description && !validateProjectDescription(description).valid) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '설명이 올바르지 않습니다.' } });
  }
  if (isShared && password && !validateProjectPassword(password).valid) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '비밀번호가 올바르지 않습니다.' } });
  }

  let passwordHash = null;
  let projectCode = isShared ? generateProjectCode() : null;

  const insertProject = async () => {
    db.run(
      'INSERT INTO projects (owner_id, title, description, project_code, password_hash, github_repo) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, title, description || null, projectCode, passwordHash, githubRepo],
      async function(err) {
        if (err) {
          console.error('프로젝트 생성 오류:', err);
          return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' } });
        }

        const projectId = this.lastID;

        // owner 멤버 추가
        db.run(
          'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
          [projectId, userId, 'owner'],
          async function(err) {
            if (err) {
              console.error('프로젝트 멤버 추가 오류:', err);
              // 프로젝트는 생성되었지만 멤버 추가 실패 - 프로젝트 삭제 시도
              db.run('DELETE FROM projects WHERE id = ?', [projectId], function(deleteErr) {
                if (deleteErr) {
                  console.error('프로젝트 롤백 오류:', deleteErr);
                }
              });
              return res.status(500).json({ 
                success: false, 
                error: { 
                  code: 'SERVER_ERROR', 
                  message: '프로젝트 생성 중 오류가 발생했습니다.' 
                } 
              });
            }

            // GitHub 정보는 프로젝트 생성 시 가져오지 않음
            // 나중에 connectGithub API를 통해 연결하고 동기화 가능

            res.status(201).json({
              success: true,
              data: {
                id: projectId,
                title,
                projectCode,
                githubRepo
              },
              message: '프로젝트가 생성되었습니다.'
            });
          }
        );
      }
    );
  };

  if (isShared && password) {
    // 비밀번호 해시화 후 프로젝트 저장
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('비밀번호 해시화 오류:', err);
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' } });
      }
      passwordHash = hash;
      insertProject();
    });
  } else {
    insertProject();
  }
};



// 프로젝트 참여 (공유 프로젝트용)
exports.join = function(req, res, next) {
  const { projectCode, password } = req.body;
  const userId = req.user.userId;
  
  // 입력 검증
  const codeValidation = validateProjectCode(projectCode);
  if (!codeValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: codeValidation.message
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
};

// 프로젝트 구성원 목록 조회
exports.getMembers = function(req, res, next) {
  const { projectId } = req.query;
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
        `SELECT u.id, u.email, u.nickname, u.profile_image, pm.role, pm.joined_at
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
                profileImage: m.profile_image,
                role: m.role,
                joinedAt: m.joined_at
              }))
            }
        });
      }
    );
  }
  );
};

// 프로젝트 목록/상세 조회
exports.getInfo = function(req, res, next) {
  const { id } = req.query;
  const userId = req.user.userId;
  
  // ID가 제공된 경우 검증
  if (id !== undefined) {
    const idValidation = validateId(id, '프로젝트 ID');
    if (!idValidation.valid) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'INVALID_INPUT',
          message: idValidation.message
        }
      });
    }
  }
  
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
              hasGithubToken: !!project.github_token, // 토큰 존재 여부만 반환 (보안)
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
      `SELECT p.id, p.title, p.status, p.project_code, p.github_repo, p.github_token, COUNT(pm.id) as member_count
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
              isShared: !!p.project_code,
              githubRepo: p.github_repo || null,
              hasGithubToken: !!p.github_token // 토큰 존재 여부만 반환 (보안)
            }))
          }
        });
      }
    );
  }
};

// GitHub 저장소 연결
exports.connectGithub = function(req, res, next) {
  const { projectId, githubRepo, githubToken } = req.body;
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
  
  const githubUrlValidation = validateGitHubUrl(githubRepo);
  if (!githubUrlValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: githubUrlValidation.message
      }
    });
  }
  
  // 프로젝트 오너인지 확인
  db.get(
    `SELECT * FROM projects WHERE id = ? AND owner_id = ?`,
    [projectId, userId],
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
        return res.status(403).json({ 
          success: false,
          error: { 
            code: 'FORBIDDEN',
            message: '프로젝트 오너만 GitHub 저장소를 연결할 수 있습니다.' 
          }
        });
      }
      
      // GitHub 저장소 정보 업데이트 (토큰 포함)
      // 토큰이 빈 문자열이거나 마스킹된 값이면 기존 토큰 유지
      const shouldUpdateToken = githubToken && 
                                 githubToken.trim() !== "" && 
                                 githubToken !== "••••••••••••••••";
      
      let updateQuery;
      let updateParams;
      
      if (shouldUpdateToken) {
        // 새 토큰이 있으면 토큰도 업데이트
        updateQuery = 'UPDATE projects SET github_repo = ?, github_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        updateParams = [githubRepo, githubToken, projectId];
      } else {
        // 토큰이 없으면 저장소만 업데이트 (토큰은 기존 값 유지)
        updateQuery = 'UPDATE projects SET github_repo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        updateParams = [githubRepo, projectId];
      }
      
      db.run(updateQuery, updateParams, function(err) {
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
        
        // 성공 응답 먼저 전송
        res.json({
          success: true,
          data: {
            message: 'GitHub 저장소가 연결되었습니다.',
            githubRepo: githubRepo
          }
        });
        
        // GitHub 정보 가져오기 (백그라운드에서 처리, 커밋 상세 제외)
        (async () => {
          try {
            // 프로젝트 토큰 또는 전달받은 토큰 사용
            const token = shouldUpdateToken ? githubToken : project.github_token;
              const githubService = new GitHubService(token);
              
              // 커밋 목록 가져오기 (통계 정보 포함)
              try {
                const commits = await githubService.getCommits(githubRepo, { perPage: 30 });
                
                // 커밋 정보를 DB에 저장 (통계 정보 포함)
                for (const commit of commits) {
                  // 커밋 상세 통계 정보 가져오기
                  let stats = null;
                  try {
                    stats = await githubService.getCommitStats(githubRepo, commit.sha);
                    console.log(`커밋 ${commit.sha.substring(0, 7)} 통계:`, {
                      linesAdded: stats.linesAdded,
                      linesDeleted: stats.linesDeleted,
                      filesChanged: stats.filesChanged
                    });
                  } catch (error) {
                    // 통계 정보 가져오기 실패해도 기본 정보는 저장
                    console.warn(`커밋 ${commit.sha.substring(0, 7)} 통계 정보 가져오기 실패:`, error.message);
                  }
                  
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
                    [
                      projectId,
                      commit.sha,
                      commit.message,
                      commit.author,
                      convertToMySQLDateTime(commit.date), // ISO 8601 -> MySQL DATETIME
                      stats ? stats.linesAdded : null,
                      stats ? stats.linesDeleted : null,
                      stats ? stats.filesChanged : null
                    ],
                    (err) => {
                      if (err) {
                        console.error('커밋 저장 오류:', err);
                      } else {
                        const savedStats = stats ? ` (통계: +${stats.linesAdded}/-${stats.linesDeleted}, 파일: ${stats.filesChanged})` : ' (통계 없음)';
                        console.log(`커밋 ${commit.sha.substring(0, 7)} 저장 완료${savedStats}`);
                        
                        // 파일별 변경 내용 저장
                        if (stats && stats.files && stats.files.length > 0) {
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
                                  console.error(`파일 ${file.filename} 저장 오류:`, fileErr);
                                }
                              }
                            );
                          });
                        }
                      }
                    }
                  );
                }
              } catch (error) {
                console.error('커밋 조회 실패:', error.message);
              }

              // 이슈 정보 가져오기 및 DB에 저장
              try {
                const issues = await githubService.getIssues(githubRepo, { state: 'all', perPage: 100 });
                
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
              try {
                const branches = await githubService.getBranches(githubRepo);
                
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
            } catch (error) {
              console.error('GitHub 정보 불러오기 실패:', error.message);
            }
          })();
        }
      );
    }
  );
};

// 프로젝트 코드 검증
exports.validateCode = function(req, res, next) {
  const { projectCode } = req.query;
  
  // 입력 검증
  const codeValidation = validateProjectCode(projectCode);
  if (!codeValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: codeValidation.message
      }
    });
  }
  
  db.get('SELECT id, title FROM projects WHERE project_code = ?', [projectCode], function(err, project) {
    if (err) {
      console.error('프로젝트 코드 검증 오류:', err);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.' 
        }
      });
    }
    
    if (!project) {
      return res.json({
        success: true,
        data: {
          isValid: false,
          exists: false
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        isValid: true,
        exists: true,
        projectId: project.id,
        title: project.title
      }
    });
  });
};

// 프로젝트 수정 (owner만)
exports.update = function(req, res, next) {
  const { projectId, title, description, status, githubRepo, githubToken } = req.body;
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
  
  // 제목 검증 (제공된 경우)
  if (title !== undefined) {
    const titleValidation = validateProjectTitle(title);
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
    const descriptionValidation = validateProjectDescription(description);
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
  
  // GitHub URL 검증 (제공된 경우)
  if (githubRepo !== undefined) {
    const githubUrlValidation = validateGitHubUrl(githubRepo);
    if (!githubUrlValidation.valid) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'INVALID_INPUT',
          message: githubUrlValidation.message
        }
      });
    }
  }
  
  // owner 권한 확인
  db.get(
    `SELECT p.*, pm.role 
     FROM projects p
     JOIN project_members pm ON p.id = pm.project_id
     WHERE p.id = ? AND pm.user_id = ? AND pm.role = 'owner'`,
    [projectId, userId],
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
        return res.status(403).json({ 
          success: false,
          error: { 
            code: 'FORBIDDEN',
            message: '프로젝트를 수정할 권한이 없습니다. (owner만 가능)' 
          }
        });
      }
      
      // 수정할 필드만 업데이트
      const updates = [];
      const values = [];
      
      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (status !== undefined) {
        if (!['active', 'archived'].includes(status)) {
          return res.status(400).json({ 
            success: false,
            error: { 
              code: 'INVALID_STATUS',
              message: '유효하지 않은 상태입니다. (active, archived만 가능)' 
            }
          });
        }
        updates.push('status = ?');
        values.push(status);
      }
      
      // GitHub 저장소 URL 업데이트
      if (githubRepo !== undefined) {
        updates.push('github_repo = ?');
        values.push(githubRepo);
      }
      
      // GitHub 토큰 업데이트 처리
      if (githubToken !== undefined) {
        // 마스킹된 값("••••••••••••••••")이면 기존 토큰 유지 (업데이트하지 않음)
        if (githubToken === "••••••••••••••••") {
          // 기존 토큰 유지 (업데이트하지 않음)
        } else if (githubToken === "") {
          // 빈 문자열이면 null로 설정 (토큰 제거)
          updates.push('github_token = ?');
          values.push(null);
        } else {
          // 새 토큰으로 업데이트
          updates.push('github_token = ?');
          values.push(githubToken);
        }
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: { 
            code: 'MISSING_FIELDS',
            message: '수정할 정보를 입력해주세요.' 
          }
        });
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(projectId);
      
      db.run(
        `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            console.error('프로젝트 수정 오류:', err);
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
            message: '프로젝트가 수정되었습니다.'
          });
        }
      );
    }
  );
};

// 프로젝트 삭제 (owner만)
exports.delete = function(req, res, next) {
  const { projectId } = req.body;
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
  
  // owner 권한 확인
  db.get(
    `SELECT p.*, pm.role 
     FROM projects p
     JOIN project_members pm ON p.id = pm.project_id
     WHERE p.id = ? AND pm.user_id = ? AND pm.role = 'owner'`,
    [projectId, userId],
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
        return res.status(403).json({ 
          success: false,
          error: { 
            code: 'FORBIDDEN',
            message: '프로젝트를 삭제할 권한이 없습니다. (owner만 가능)' 
          }
        });
      }
      
      // 프로젝트 삭제 (CASCADE로 관련 데이터 자동 삭제)
      db.run('DELETE FROM projects WHERE id = ?', [projectId], function(err) {
        if (err) {
          console.error('프로젝트 삭제 오류:', err);
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
          message: '프로젝트가 삭제되었습니다.'
        });
      });
    }
  );
};

// 멤버 삭제 (owner만, !owner는 삭제 불가)
exports.deleteMember = function(req, res, next) {
  const { projectId, memberId } = req.body;
  const userId = req.user.userId;
  
  if (!projectId || !memberId) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '프로젝트 ID와 멤버 ID가 필요합니다.' 
      }
    });
  }
  
  // owner 권한 확인
  db.get(
    `SELECT pm.role 
     FROM project_members pm
     WHERE pm.project_id = ? AND pm.user_id = ? AND pm.role = 'owner'`,
    [projectId, userId],
    function(err, ownerCheck) {
      if (err) {
        console.error('권한 확인 오류:', err);
        return res.status(500).json({ 
          success: false,
          error: { 
            code: 'SERVER_ERROR',
            message: '서버 오류가 발생했습니다.' 
          }
        });
      }
      
      if (!ownerCheck) {
        return res.status(403).json({ 
          success: false,
          error: { 
            code: 'FORBIDDEN',
            message: '멤버를 삭제할 권한이 없습니다. (owner만 가능)' 
          }
        });
      }
      
      // 삭제할 멤버의 역할 확인 (!owner는 삭제 불가)
      db.get(
        `SELECT role FROM project_members 
         WHERE project_id = ? AND user_id = ?`,
        [projectId, memberId],
        function(err, member) {
          if (err) {
            console.error('멤버 조회 오류:', err);
            return res.status(500).json({ 
              success: false,
              error: { 
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.' 
              }
            });
          }
          
          if (!member) {
            return res.status(404).json({ 
              success: false,
              error: { 
                code: 'MEMBER_NOT_FOUND',
                message: '멤버를 찾을 수 없습니다.' 
              }
            });
          }
          
          if (member.role === 'owner') {
            return res.status(400).json({ 
              success: false,
              error: { 
                code: 'CANNOT_DELETE_OWNER',
                message: '프로젝트 소유자는 삭제할 수 없습니다.' 
              }
            });
          }
          
          // 멤버 삭제
          db.run(
            'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
            [projectId, memberId],
            function(err) {
              if (err) {
                console.error('멤버 삭제 오류:', err);
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
                message: '멤버가 삭제되었습니다.'
              });
            }
          );
        }
      );
    }
  );
};

// 프로젝트 탈퇴 (일반 멤버만)
exports.leave = function(req, res, next) {
  const { projectId } = req.body;
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
  
  // 멤버십 및 역할 확인
  db.get(
    `SELECT role FROM project_members 
     WHERE project_id = ? AND user_id = ?`,
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
        return res.status(404).json({ 
          success: false,
          error: { 
            code: 'NOT_MEMBER',
            message: '프로젝트 멤버가 아닙니다.' 
          }
        });
      }
      
      if (membership.role === 'owner') {
        return res.status(400).json({ 
          success: false,
          error: { 
            code: 'OWNER_CANNOT_LEAVE',
            message: '프로젝트 소유자는 탈퇴할 수 없습니다. 프로젝트를 삭제해주세요.' 
          }
        });
      }
      
      // 멤버 탈퇴
      db.run(
        'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId],
        function(err) {
          if (err) {
            console.error('프로젝트 탈퇴 오류:', err);
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
            message: '프로젝트에서 탈퇴했습니다.'
          });
        }
      );
    }
  );
};

