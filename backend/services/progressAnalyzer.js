const { db } = require('../database/db');

/**
 * 진행도 분석 서비스
 */
class ProgressAnalyzer {
  /**
   * 프로젝트 진행도 계산
   */
  async getProjectProgress(projectId) {
    return new Promise((resolve, reject) => {
      // Task 기반 진행도
      db.all(
        'SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status',
        [projectId],
        function(err, taskStats) {
          if (err) {
            return reject(err);
          }

          const stats = {
            total: 0,
            todo: 0,
            inProgress: 0,
            done: 0,
            taskProgress: 0
          };

          taskStats.forEach(row => {
            stats.total += row.count;
            if (row.status === 'todo') stats.todo = row.count;
            else if (row.status === 'in_progress') stats.inProgress = row.count;
            else if (row.status === 'done') stats.done = row.count;
          });

          if (stats.total > 0) {
            stats.taskProgress = Math.round((stats.done / stats.total) * 100);
          }

          // 코드 기반 진행도 (커밋 통계)
          db.all(
            `SELECT 
              COUNT(*) as commitCount,
              SUM(lines_added) as totalLinesAdded,
              SUM(lines_deleted) as totalLinesDeleted,
              COUNT(DISTINCT DATE(commit_date)) as activeDays
            FROM project_commits 
            WHERE project_id = ?`,
            [projectId],
            function(err, commitStats) {
              if (err) {
                return reject(err);
              }

              const codeStats = {
                commitCount: commitStats[0]?.commitCount || 0,
                totalLinesAdded: commitStats[0]?.totalLinesAdded || 0,
                totalLinesDeleted: commitStats[0]?.totalLinesDeleted || 0,
                activeDays: commitStats[0]?.activeDays || 0,
                codeProgress: 0
              };

              // 간단한 코드 진행도 계산 (커밋 수 기반, 향후 더 정교하게 개선 가능)
              // 예: 프로젝트 시작일 기준으로 예상 커밋 수 대비 실제 커밋 수
              if (codeStats.commitCount > 0) {
                // 기본 진행도는 Task 진행도를 사용하고, 코드 진행도는 보조 지표
                codeStats.codeProgress = Math.min(100, Math.round(codeStats.commitCount / 10) * 10);
              }

              // 팀원별 기여도
              db.all(
                `SELECT 
                  author,
                  COUNT(*) as commitCount,
                  SUM(lines_added) as linesAdded,
                  SUM(lines_deleted) as linesDeleted
                FROM project_commits 
                WHERE project_id = ?
                GROUP BY author
                ORDER BY commitCount DESC`,
                [projectId],
                function(err, contributions) {
                  if (err) {
                    return reject(err);
                  }

                  resolve({
                    taskProgress: stats.taskProgress,
                    taskStats: stats,
                    codeProgress: codeStats.codeProgress,
                    codeStats: codeStats,
                    contributions: contributions || []
                  });
                }
              );
            }
          );
        }
      );
    });
  }
}

module.exports = new ProgressAnalyzer();

