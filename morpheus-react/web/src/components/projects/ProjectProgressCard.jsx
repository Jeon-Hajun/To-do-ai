import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Stack,
  Divider,
  Chip,
  Grid,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getProjectProgress } from "../../api/progress";
import CircularProgress from "@mui/material/CircularProgress";

export default function ProjectProgressCard({ projectId }) {
  const { data: progressData, isLoading, error } = useQuery({
    queryKey: ["projectProgress", projectId],
    queryFn: () => getProjectProgress(projectId),
    enabled: !!projectId,
    refetchInterval: 30000, // 30초마다 자동 갱신
  });

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error || !progressData?.success) {
    return (
      <Card sx={{ p: 2 }}>
        <Typography color="error" variant="body2">
          진행도 정보를 불러올 수 없습니다.
        </Typography>
      </Card>
    );
  }

  const progress = progressData.data;
  const taskProgress = progress?.taskProgress || 0;
  const codeProgress = progress?.codeProgress || 0;
  const taskStats = progress?.taskStats || {};
  const codeStats = progress?.codeStats || {};
  const contributions = progress?.contributions || [];

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          프로젝트 진행도
        </Typography>

        {/* Task 기반 진행도 */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              Task 진행도
            </Typography>
            <Typography variant="h6" color="primary" fontWeight="bold">
              {taskProgress}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={taskProgress}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: "grey.200",
              "& .MuiLinearProgress-bar": {
                borderRadius: 5,
              },
            }}
          />
          <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
            <Chip
              label={`전체: ${taskStats.total || 0}개`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`대기: ${taskStats.todo || 0}개`}
              size="small"
              color="default"
            />
            <Chip
              label={`진행중: ${taskStats.inProgress || 0}개`}
              size="small"
              color="primary"
            />
            <Chip
              label={`완료: ${taskStats.done || 0}개`}
              size="small"
              color="success"
            />
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 코드 기반 진행도 */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              코드 활동
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {codeStats.commitCount || 0}개 커밋
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={codeProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "grey.200",
              "& .MuiLinearProgress-bar": {
                borderRadius: 4,
                backgroundColor: "secondary.main",
              },
            }}
          />
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                추가된 라인
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {codeStats.totalLinesAdded?.toLocaleString() || 0}줄
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                삭제된 라인
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {codeStats.totalLinesDeleted?.toLocaleString() || 0}줄
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                활성 일수
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {codeStats.activeDays || 0}일
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                커밋 수
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {codeStats.commitCount || 0}개
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* 팀원별 기여도 */}
        {contributions.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
                팀원별 기여도
              </Typography>
              <Stack spacing={1.5}>
                {contributions.slice(0, 5).map((contrib, index) => (
                  <Box key={index}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {contrib.author || "알 수 없음"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {contrib.commitCount || 0}개 커밋
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={
                        contributions.length > 0
                          ? Math.round((contrib.commitCount / contributions[0].commitCount) * 100)
                          : 0
                      }
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "grey.200",
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                      +{contrib.linesAdded?.toLocaleString() || 0}줄 / -{contrib.linesDeleted?.toLocaleString() || 0}줄
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </>
        )}

        {contributions.length === 0 && codeStats.commitCount === 0 && (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              아직 커밋 데이터가 없습니다.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

