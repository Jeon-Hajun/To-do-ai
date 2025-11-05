var express = require('express');
var progressAnalyzer = require('../services/progressAnalyzer');
var { db } = require('../database/init');
var { authenticateToken } = require('../middleware/auth');

var router = express.Router();

// 프로젝트 진행도 조회
router.get('/project/:projectId', authenticateToken, async function(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  // 프로젝트 멤버인지 확인
  db.get(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId],
    async function(err, membership) {
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

      try {
        const progress = await progressAnalyzer.getProjectProgress(projectId);
        res.json({ 
          success: true,
          data: progress 
        });
      } catch (error) {
        console.error('진행도 조회 오류:', error);
        res.status(500).json({ 
          success: false,
          error: { 
            code: 'SERVER_ERROR',
            message: '서버 오류가 발생했습니다.' 
          }
        });
      }
    }
  );
});

module.exports = router;

