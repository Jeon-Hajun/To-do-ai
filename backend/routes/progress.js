var express = require('express');
var progressAnalyzer = require('../services/progressAnalyzer');
var { db } = require('../database/init');
var { authenticateToken } = require('../middleware/auth');

var router = express.Router();

// 프로젝트 진행도 조회
router.get('/project/:projectId', authenticateToken, async function(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  // 프로젝트 접근 권한 확인
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

      try {
        const progress = await progressAnalyzer.getProjectProgress(projectId);
        res.json({ progress });
      } catch (error) {
        console.error('진행도 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
    }
  );
});

module.exports = router;

