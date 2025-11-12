import React, { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { getIssues } from "../../api/githubApi";

/**
 * 이슈 목록 컴포넌트
 * 프로젝트의 이슈 목록을 표시합니다.
 */
export default function IssueList({ projectId }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchIssues = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await getIssues(projectId);
      if (res.success) {
        const issueList = res.data.issues || [];
        setIssues(issueList);
      } else {
        setError(res.error?.message || "이슈 목록을 불러올 수 없습니다.");
      }
    } catch (err) {
      setError("이슈 목록을 불러오는 중 오류가 발생했습니다.");
      console.error("이슈 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchIssues();
    }
  }, [projectId, fetchIssues]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStateColor = (state) => {
    return state === "open" ? "success" : "default";
  };

  const getStateLabel = (state) => {
    return state === "open" ? "열림" : "닫힘";
  };

  if (!projectId) {
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {issues.length === 0 ? (
        <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            이슈가 없습니다.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {issues.map((issue) => (
            <Card
              key={issue.number}
              sx={{
                "&:hover": {
                  boxShadow: 3,
                },
              }}
            >
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                    #{issue.number} {issue.title}
                  </Typography>
                  <Chip
                    label={getStateLabel(issue.state)}
                    size="small"
                    color={getStateColor(issue.state)}
                    variant="outlined"
                  />
                </Stack>
                {issue.body && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 1, 
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word"
                    }}
                  >
                    {issue.body}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  {issue.createdAt && (
                    <Typography variant="caption" color="text.secondary">
                      생성: {formatDate(issue.createdAt)}
                    </Typography>
                  )}
                  {issue.updatedAt && (
                    <Typography variant="caption" color="text.secondary">
                      • 수정: {formatDate(issue.updatedAt)}
                    </Typography>
                  )}
                  {issue.labels && issue.labels.length > 0 && (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                      {issue.labels.map((label, idx) => (
                        <Chip
                          key={idx}
                          label={typeof label === "string" ? label : label.name}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.7rem" }}
                        />
                      ))}
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}

