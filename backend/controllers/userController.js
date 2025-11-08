var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var path = require('path');
var { db } = require('../database/db');
var { validateEmail, validatePassword, validateNickname } = require('../utils/validators');
require('dotenv').config();

// 프로필 이미지 저장 폴더 및 파일명 설정
var profileDir = path.join(__dirname, '../public/profile');
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

// 회원가입
exports.signup = function(req, res, next) {
  const { email, password, nickname } = req.body;
  
  // 입력 검증
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: emailValidation.message
      }
    });
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: passwordValidation.message
      }
    });
  }
  
  const nicknameValidation = validateNickname(nickname);
  if (!nicknameValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: nicknameValidation.message
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
        'INSERT INTO users (email, password, nickname, profile_image) VALUES (?, ?, ?, ?)',
        [email, passwordHash, nickname, 'basic.png'],
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
};

// 로그인
exports.login = function(req, res, next) {
  const { email, password } = req.body;
  
  // 입력 검증
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: emailValidation.message
      }
    });
  }
  
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'MISSING_FIELDS',
        message: '비밀번호를 입력해주세요.' 
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
      
      // JWT 토큰 생성 (만료 시간 없음 - 로그아웃 전까지 유지)
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          nickname: user.nickname,
          profileImage: user.profile_image
        },
        process.env.JWT_SECRET || 'secretkey'
      );
      
      res.json({
        success: true,
        data: {
          token: token,
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            profileImage: user.profile_image
          }
        },
        message: '로그인 성공'
      });
    });
  });
};

// 아이디 중복 확인
exports.checkDuplicate = function(req, res, next) {
  const { email } = req.query;
  
  // 입력 검증
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ 
      success: false,
      error: { 
        code: 'INVALID_INPUT',
        message: emailValidation.message
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
};

// 내 정보 조회
exports.getMe = function(req, res, next) {
  var userId = req.user.userId;
  
  db.get(
    'SELECT id, email, nickname, profile_image, created_at FROM users WHERE id = ?',
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
          profileImage: user.profile_image,
          createdAt: user.created_at
        }
      });
    }
  );
};

// 회원 정보 수정
exports.updateMe = function(req, res, next) {
  var userId = req.user.userId;
  var { nickname, email, password, newPassword } = req.body;
  
  // 입력 검증
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: emailValidation.message
      }
    });
  }
  
  const nicknameValidation = validateNickname(nickname);
  if (!nicknameValidation.valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: nicknameValidation.message
      }
    });
  }
  
  // 새 비밀번호가 있으면 검증
  if (newPassword) {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: passwordValidation.message
        }
      });
    }
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
            'UPDATE users SET nickname = ?, email = ?, password = ? WHERE id = ?',
            [nickname, email, hashedNewPassword, userId],
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
                'SELECT id, email, nickname, profile_image FROM users WHERE id = ?',
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
                        nickname: updatedUser.nickname,
                        email: updatedUser.email,
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
        'UPDATE users SET nickname = ?, email = ? WHERE id = ?',
        [nickname, email, userId],
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
            'SELECT id, email, nickname, profile_image FROM users WHERE id = ?',
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
                    nickname: updatedUser.nickname,
                    email: updatedUser.email,
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
};

// 프로필 이미지 업로드
exports.uploadProfileImage = function(req, res, next) {
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
};

// 프로필 이미지 삭제 (기본 이미지로 변경)
exports.deleteProfileImage = function(req, res, next) {
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
};

// 회원 탈퇴
exports.deleteMe = function(req, res, next) {
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
};

