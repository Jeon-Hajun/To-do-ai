var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var { db } = require('../database/init');
var { authenticateToken, authMiddleware } = require('../middleware/auth');
var { adminMiddleware } = require('../middleware/adminMiddleware');
require('dotenv').config();

var router = express.Router();

// 프로필 이미지 저장 폴더 및 파일명 설정
var profileDir = path.join(__dirname, '../public/profile');
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, profileDir);
  },
  filename: function(req, file, cb) {
    cb(null, req.user.userId + '.png');
  }
});

var upload = multer({ storage: storage });

// 회원가입
router.post('/join', function(req, res, next) {
  const { email, password, nickname } = req.body;
  
  if (!email || !password || !nickname) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '이메일, 비밀번호, 닉네임을 모두 입력해주세요.' 
      }
    });
  }
  
  // 이메일 중복 확인
  db.get('SELECT id FROM users WHERE email = ?', [email], function(err, row) {
    if (err) {
      console.error('회원가입 오류:', err);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.' 
        }
      });
    }
    
    if (row) {
      return res.status(400).json({ 
        success: false,
        error: { 
          code: 'EMAIL_EXISTS',
          message: '이미 존재하는 이메일입니다.' 
        }
      });
    }
    
    // 비밀번호 해시화
    bcrypt.hash(password, 10, function(err, passwordHash) {
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
      
      // 사용자 생성
      db.run(
        'INSERT INTO users (email, password, nickname, region, profile_image) VALUES (?, ?, ?, ?, ?)',
        [email, passwordHash, nickname, null, 'basic.png'],
        function(err) {
          if (err) {
            console.error('사용자 생성 오류:', err);
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
              email: email,
              nickname: nickname
            },
            message: '회원가입이 완료되었습니다.'
          });
        }
      );
    });
  });
});

// 로그인
router.post('/login', function(req, res, next) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '이메일과 비밀번호를 입력해주세요.' 
      }
    });
  }
  
  // 사용자 조회
  db.get('SELECT * FROM users WHERE email = ?', [email], function(err, user) {
    if (err) {
      console.error('로그인 오류:', err);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.' 
        }
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: { 
          code: 'INVALID_CREDENTIALS',
          message: '이메일 또는 비밀번호가 올바르지 않습니다.' 
        }
      });
    }
    
    // 비밀번호 확인
    bcrypt.compare(password, user.password, function(err, isValidPassword) {
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
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false,
          error: { 
            code: 'INVALID_CREDENTIALS',
            message: '이메일 또는 비밀번호가 올바르지 않습니다.' 
          }
        });
      }
      
      // 계정 정지 상태 확인
      if (user.is_suspended === 1) {
        var now = new Date();
        var suspensionEnd = new Date(user.suspension_end_date);
        
        if (now < suspensionEnd) {
          var remainingDays = Math.ceil((suspensionEnd - now) / (1000 * 60 * 60 * 24));
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCOUNT_SUSPENDED',
              message: '계정이 정지되었습니다. (' + remainingDays + '일 남음)',
              suspensionReason: user.suspension_reason,
              suspensionEndDate: user.suspension_end_date
            }
          });
        } else {
          // 정지 기간이 지났으면 정지 해제
          db.run(
            'UPDATE users SET is_suspended = 0, suspension_reason = NULL, suspension_start_date = NULL, suspension_end_date = NULL WHERE id = ?',
            [user.id],
            function(err) {
              if (err) {
                console.error('정지 해제 오류:', err);
              }
            }
          );
          user.is_suspended = 0;
        }
      }
      
      // JWT 토큰 생성
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          nickname: user.nickname,
          profileImage: user.profile_image,
          isAdmin: user.is_admin === 1 || false
        },
        process.env.JWT_SECRET || 'secretkey',
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        data: {
          token: token,
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            profileImage: user.profile_image,
            isAdmin: user.is_admin === 1 || false
          }
        },
        message: '로그인 성공'
      });
    });
  });
});

// 로그아웃
router.post('/logout', authenticateToken, function(req, res, next) {
  // JWT는 stateless이므로 클라이언트에서 토큰을 삭제하면 됨
  // 향후 토큰 블랙리스트 기능이 필요하면 추가 가능
  res.json({
    success: true,
    message: '로그아웃되었습니다.'
  });
});

// 아이디 중복 확인
router.get('/duplicate', function(req, res, next) {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '이메일을 입력해주세요.' 
      }
    });
  }
  
  db.get('SELECT id FROM users WHERE email = ?', [email], function(err, row) {
    if (err) {
      console.error('중복 확인 오류:', err);
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
        available: !row 
      }
    });
  });
});

// 회원가입 (signup 별칭)
router.post('/signup', function(req, res, next) {
  var { email, password, nickname, region } = req.body;
  
  if (!email || !password || !nickname) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FIELDS',
        message: '이메일, 비밀번호, 닉네임을 모두 입력해주세요.'
      }
    });
  }
  
  // 이메일 중복 확인
  db.get('SELECT id FROM users WHERE email = ?', [email], function(err, row) {
    if (err) {
      console.error('회원가입 오류:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.'
        }
      });
    }
    
    if (row) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: '이미 존재하는 이메일입니다.'
        }
      });
    }
    
    // 비밀번호 해시화
    bcrypt.hash(password, 10, function(err, passwordHash) {
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
      
      // 사용자 생성
      db.run(
        'INSERT INTO users (email, password, nickname, region, profile_image) VALUES (?, ?, ?, ?, ?)',
        [email, passwordHash, nickname, region || null, 'basic.png'],
        function(err) {
          if (err) {
            console.error('사용자 생성 오류:', err);
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
              email: email,
              nickname: nickname
            },
            message: '회원가입이 완료되었습니다.'
          });
        }
      );
    });
  });
});

// 회원정보 조회
router.get('/info', authenticateToken, function(req, res, next) {
  const userId = req.user.userId;
  
  db.get('SELECT id, email, nickname, profile_image, created_at FROM users WHERE id = ?', [userId], function(err, user) {
    if (err) {
      console.error('회원정보 조회 오류:', err);
      return res.status(500).json({ 
        success: false,
        error: { 
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.' 
        }
      });
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: { 
          code: 'USER_NOT_FOUND',
          message: '사용자를 찾을 수 없습니다.' 
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profileImage: user.profile_image,
        createdAt: user.created_at
      }
    });
  });
});

// 내 정보 조회 (RESTful 스타일)
router.get('/me', authMiddleware, function(req, res, next) {
  var userId = req.user.userId;
  
  db.get(
    'SELECT id, email, nickname, region, profile_image, is_admin, created_at FROM users WHERE id = ?',
    [userId],
    function(err, user) {
      if (err) {
        console.error('회원정보 조회 오류:', err);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: '서버 오류가 발생했습니다.'
          }
        });
      }
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '사용자를 찾을 수 없습니다.'
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          name: user.nickname,
          region: user.region,
          profileImage: user.profile_image,
          isAdmin: user.is_admin === 1 || false,
          createdAt: user.created_at
        }
      });
    }
  );
});

// 회원 정보 수정
router.put('/me', authMiddleware, function(req, res, next) {
  var userId = req.user.userId;
  var { name, email, region, password, newPassword } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_FIELDS',
        message: '필수 정보가 누락되었습니다.'
      }
    });
  }
  
  // 현재 사용자 정보 조회
  db.get('SELECT password FROM users WHERE id = ?', [userId], function(err, currentUser) {
    if (err) {
      console.error('사용자 조회 오류:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.'
        }
      });
    }
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '사용자를 찾을 수 없습니다.'
        }
      });
    }
    
    // 비밀번호 변경 여부 확인
    if (newPassword) {
      if (!password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: '현재 비밀번호를 입력해주세요.'
          }
        });
      }
      
      // 현재 비밀번호 확인
      bcrypt.compare(password, currentUser.password, function(err, isMatch) {
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
        
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_PASSWORD',
              message: '현재 비밀번호가 일치하지 않습니다.'
            }
          });
        }
        
        // 새 비밀번호 해시
        bcrypt.hash(newPassword, 10, function(err, hashedNewPassword) {
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
          
          // DB 업데이트
          db.run(
            'UPDATE users SET nickname = ?, email = ?, region = ?, password = ? WHERE id = ?',
            [name, email, region || null, hashedNewPassword, userId],
            function(err) {
              if (err) {
                console.error('회원정보 수정 오류:', err);
                return res.status(500).json({
                  success: false,
                  error: {
                    code: 'SERVER_ERROR',
                    message: '서버 오류가 발생했습니다.'
                  }
                });
              }
              
              // 업데이트 후 최신 정보 조회
              db.get(
                'SELECT id, email, nickname, region, profile_image FROM users WHERE id = ?',
                [userId],
                function(err, updatedUser) {
                  if (err) {
                    console.error('사용자 조회 오류:', err);
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
                      user: {
                        name: updatedUser.nickname,
                        email: updatedUser.email,
                        region: updatedUser.region,
                        profileImage: updatedUser.profile_image
                      }
                    },
                    message: '회원 정보가 수정되었습니다.'
                  });
                }
              );
            }
          );
        });
      });
    } else {
      // 비밀번호 변경 없이 업데이트
      db.run(
        'UPDATE users SET nickname = ?, email = ?, region = ? WHERE id = ?',
        [name, email, region || null, userId],
        function(err) {
          if (err) {
            console.error('회원정보 수정 오류:', err);
            return res.status(500).json({
              success: false,
              error: {
                code: 'SERVER_ERROR',
                message: '서버 오류가 발생했습니다.'
              }
            });
          }
          
          // 업데이트 후 최신 정보 조회
          db.get(
            'SELECT id, email, nickname, region, profile_image FROM users WHERE id = ?',
            [userId],
            function(err, updatedUser) {
              if (err) {
                console.error('사용자 조회 오류:', err);
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
                  user: {
                    name: updatedUser.nickname,
                    email: updatedUser.email,
                    region: updatedUser.region,
                    profileImage: updatedUser.profile_image
                  }
                },
                message: '회원 정보가 수정되었습니다.'
              });
            }
          );
        }
      );
    }
  });
});

// 프로필 이미지 업로드
router.post('/me/profile-image', authMiddleware, upload.single('profileImage'), function(req, res, next) {
  var userId = req.user.userId;
  var fileName = userId + '.png';
  
  // DB 업데이트
  db.run('UPDATE users SET profile_image = ? WHERE id = ?', [fileName, userId], function(err) {
    if (err) {
      console.error('프로필 이미지 업데이트 오류:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '프로필 이미지 업데이트 실패'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        profileImage: fileName
      },
      message: '프로필 이미지가 업데이트되었습니다.'
    });
  });
});

// 프로필 이미지 삭제 (기본 이미지로 변경)
router.delete('/me/profile-image', authMiddleware, function(req, res, next) {
  var userId = req.user.userId;
  var filePath = path.join(profileDir, userId + '.png');
  
  // 기존 이미지 삭제
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  
  // DB 업데이트
  db.run('UPDATE users SET profile_image = ? WHERE id = ?', ['basic.png', userId], function(err) {
    if (err) {
      console.error('프로필 이미지 삭제 오류:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '프로필 이미지 삭제 실패'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        profileImage: 'basic.png'
      },
      message: '프로필 이미지가 삭제되었습니다.'
    });
  });
});

// 회원 탈퇴
router.delete('/me', authMiddleware, function(req, res, next) {
  var userId = req.user.userId;
  
  // 사용자 삭제 (CASCADE로 관련 데이터도 함께 삭제됨)
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      console.error('회원 탈퇴 오류:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '회원 탈퇴 실패'
        }
      });
    }
    
    res.json({
      success: true,
      message: '회원 탈퇴가 완료되었습니다.'
    });
  });
});

// 관리자용 사용자 목록 조회
router.get('/users', adminMiddleware, function(req, res, next) {
  db.all(
    'SELECT id, email, nickname, region, profile_image, is_admin, is_suspended, suspension_reason, suspension_start_date, suspension_end_date, created_at FROM users WHERE is_admin = 0 ORDER BY created_at DESC',
    [],
    function(err, users) {
      if (err) {
        console.error('사용자 목록 조회 에러:', err);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: '사용자 목록 조회 실패'
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          users: users.map(function(user) {
            return {
              id: user.id,
              email: user.email,
              nickname: user.nickname,
              region: user.region,
              profileImage: user.profile_image,
              isAdmin: user.is_admin === 1,
              isSuspended: user.is_suspended === 1,
              suspensionReason: user.suspension_reason,
              suspensionStartDate: user.suspension_start_date,
              suspensionEndDate: user.suspension_end_date,
              createdAt: user.created_at
            };
          })
        }
      });
    }
  );
});

// 관리자용 사용자 정지
router.post('/admin/:userId/suspend', adminMiddleware, function(req, res, next) {
  var userId = req.params.userId;
  var { days, reason } = req.body;
  var adminId = req.user.userId;
  
  // 정지할 사용자 정보 조회
  db.get('SELECT * FROM users WHERE id = ?', [userId], function(err, userToSuspend) {
    if (err) {
      console.error('사용자 조회 에러:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.'
        }
      });
    }
    
    if (!userToSuspend) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '사용자를 찾을 수 없습니다.'
        }
      });
    }
    
    // 관리자는 자신을 정지할 수 없음
    if (parseInt(userId) === adminId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '자신의 계정은 정지할 수 없습니다.'
        }
      });
    }
    
    // 정지 설정
    var suspensionEndDate = new Date();
    suspensionEndDate.setDate(suspensionEndDate.getDate() + parseInt(days));
    
    db.run(
      'UPDATE users SET is_suspended = 1, suspension_reason = ?, suspension_start_date = datetime("now"), suspension_end_date = ? WHERE id = ?',
      [reason, suspensionEndDate.toISOString(), userId],
      function(err) {
        if (err) {
          console.error('사용자 정지 에러:', err);
          return res.status(500).json({
            success: false,
            error: {
              code: 'SERVER_ERROR',
              message: '사용자 정지 실패'
            }
          });
        }
        
        res.json({
          success: true,
          data: {
            suspensionEndDate: suspensionEndDate.toISOString()
          },
          message: '사용자 ' + userToSuspend.nickname + '(' + userToSuspend.email + ')이 ' + days + '일간 정지되었습니다.'
        });
      }
    );
  });
});

// 관리자용 사용자 정지 해제
router.post('/admin/:userId/unsuspend', adminMiddleware, function(req, res, next) {
  var userId = req.params.userId;
  
  // 정지 해제할 사용자 정보 조회
  db.get('SELECT * FROM users WHERE id = ?', [userId], function(err, userToUnsuspend) {
    if (err) {
      console.error('사용자 조회 에러:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.'
        }
      });
    }
    
    if (!userToUnsuspend) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '사용자를 찾을 수 없습니다.'
        }
      });
    }
    
    // 정지 해제
    db.run(
      'UPDATE users SET is_suspended = 0, suspension_reason = NULL, suspension_start_date = NULL, suspension_end_date = NULL WHERE id = ?',
      [userId],
      function(err) {
        if (err) {
          console.error('사용자 정지 해제 에러:', err);
          return res.status(500).json({
            success: false,
            error: {
              code: 'SERVER_ERROR',
              message: '사용자 정지 해제 실패'
            }
          });
        }
        
        res.json({
          success: true,
          message: '사용자 ' + userToUnsuspend.nickname + '(' + userToUnsuspend.email + ')의 정지가 해제되었습니다.'
        });
      }
    );
  });
});

// 관리자용 계정 삭제
router.delete('/admin/:userId', adminMiddleware, function(req, res, next) {
  var userId = req.params.userId;
  var adminId = req.user.userId;
  
  // 삭제할 사용자 정보 조회
  db.get('SELECT * FROM users WHERE id = ?', [userId], function(err, userToDelete) {
    if (err) {
      console.error('사용자 조회 에러:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '서버 오류가 발생했습니다.'
        }
      });
    }
    
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '사용자를 찾을 수 없습니다.'
        }
      });
    }
    
    // 관리자는 자신을 삭제할 수 없음
    if (parseInt(userId) === adminId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '자신의 계정은 삭제할 수 없습니다.'
        }
      });
    }
    
    // 사용자 삭제 (CASCADE로 관련 데이터도 함께 삭제됨)
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        console.error('관리자 계정 삭제 에러:', err);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: '계정 삭제 실패'
          }
        });
      }
      
      res.json({
        success: true,
        message: '사용자 ' + userToDelete.nickname + '(' + userToDelete.email + ')의 계정이 삭제되었습니다.'
      });
    });
  });
});

module.exports = router;
