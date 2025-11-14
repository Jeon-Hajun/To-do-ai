import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Pagination from "@mui/material/Pagination";
import { getCommits } from "../../api/github";

const ITEMS_PER_PAGE = 10;

/**
 * 커밋 목록 컴포넌트
 * 프로젝트의 커밋 목록을 표시하고, 클릭 시 상세 정보 페이지로 이동합니다.
 */
export default function CommitList({ projectId }) {
  const navigate = useNavigate();
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCommits = useCallback(async (currentPage = 1) => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const res = await getCommits(projectId, { limit: ITEMS_PER_PAGE, offset });
      if (res.success) {
        // 백엔드에서 받은 데이터를 프론트엔드 형식으로 변환
        const rawCommits = res.data.commits || [];
        const transformedCommits = rawCommits.map((commit) => ({
          sha: commit.commit_sha || commit.sha,
          message: commit.commit_message || commit.message,
          author: commit.author,
          date: commit.commit_date || commit.date,
          linesAdded: commit.lines_added !== null && commit.lines_added !== undefined 
            ? commit.lines_added 
            : commit.linesAdded,
          linesDeleted: commit.lines_deleted !== null && commit.lines_deleted !== undefined 
            ? commit.lines_deleted 
            : commit.linesDeleted,
          filesChanged: commit.files_changed !== null && commit.files_changed !== undefined 
            ? commit.files_changed 
            : commit.filesChanged,
        }));
        setCommits(transformedCommits);
        const totalCount = Number(res.data.total) || 0;
        setTotal(totalCount);
        console.log('[CommitList] 페이지네이션 정보:', { total: totalCount, currentPage, itemsPerPage: ITEMS_PER_PAGE });
      } else {
        setError(res.error?.message || "커밋 목록을 불러올 수 없습니다.");
      }
    } catch (err) {
      setError("커밋 목록을 불러오는 중 오류가 발생했습니다.");
      console.error("커밋 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchCommits(page);
    }
  }, [projectId, page, fetchCommits]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleCommitClick = (commitSha) => {
    navigate(`/projects/${projectId}/commit/${commitSha}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // projectId가 없으면 아무것도 렌더링하지 않음
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

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <>
      <Box>
        <Typography variant="h6" gutterBottom>
          커밋 목록 ({total}개)
        </Typography>
        {commits.length === 0 ? (
          <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1, border: 1, borderColor: "divider" }}>
            <Typography variant="body2" color="text.secondary">
              커밋이 없습니다.
            </Typography>
          </Box>
        ) : (
          <>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {commits
                .filter((commit) => commit && commit.sha)
                .map((commit) => (
                  <Card
                    key={commit.sha}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        boxShadow: 3,
                      },
                    }}
                    onClick={() => handleCommitClick(commit.sha)}
                  >
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom sx={{ wordBreak: "break-word" }}>
                        {commit.message || "커밋 메시지 없음"}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                        {commit.author && (
                          <Typography variant="caption" color="text.secondary">
                            {commit.author}
                          </Typography>
                        )}
                        {commit.date && (
                          <Typography variant="caption" color="text.secondary">
                            • {formatDate(commit.date)}
                          </Typography>
                        )}
                        {commit.sha && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: "monospace" }}
                          >
                            • {commit.sha.substring(0, 7)}
                          </Typography>
                        )}
                        {commit.linesAdded !== null && commit.linesAdded !== undefined && (
                          <>
                            <Chip
                              label={`+${commit.linesAdded}`}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                            <Chip
                              label={`-${commit.linesDeleted || 0}`}
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          </>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
            </Stack>
            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </>
  );
}

