import React, { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Pagination from "@mui/material/Pagination";
import { getBranches } from "../../api/github";

const ITEMS_PER_PAGE = 10;

/**
 * 브랜치 목록 컴포넌트
 * 프로젝트의 브랜치 목록을 표시합니다.
 */
export default function BranchList({ projectId }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchBranches = useCallback(async (currentPage = 1) => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const res = await getBranches(projectId, { limit: ITEMS_PER_PAGE, offset });
      if (res.success) {
        const branchList = res.data.branches || [];
        setBranches(branchList);
        const totalCount = Number(res.data.total) || 0;
        setTotal(totalCount);
        console.log('[BranchList] 페이지네이션 정보:', { total: totalCount, currentPage, itemsPerPage: ITEMS_PER_PAGE });
      } else {
        setError(res.error?.message || "브랜치 목록을 불러올 수 없습니다.");
      }
    } catch (err) {
      setError("브랜치 목록을 불러오는 중 오류가 발생했습니다.");
      console.error("브랜치 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchBranches(page);
    }
  }, [projectId, page, fetchBranches]);

  const handlePageChange = (event, value) => {
    setPage(value);
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
  console.log('[BranchList] 렌더링:', { total, totalPages, branchesCount: branches.length, showPagination: totalPages > 1 });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        브랜치 목록 ({total}개)
      </Typography>
      {branches.length === 0 ? (
        <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1, border: 1, borderColor: "divider" }}>
          <Typography variant="body2" color="text.secondary">
            브랜치가 없습니다.
          </Typography>
        </Box>
      ) : (
        <>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {branches.map((branch) => (
              <Card
                key={branch.name || branch.branch_name}
                sx={{
                  "&:hover": {
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle1" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {branch.name || branch.branch_name}
                    </Typography>
                    {(branch.isDefault || branch.is_default) && (
                      <Chip label="기본" size="small" color="primary" variant="outlined" />
                    )}
                    {(branch.protected || branch.is_protected) && (
                      <Chip label="보호됨" size="small" color="warning" variant="outlined" />
                    )}
                  </Stack>
                  {(branch.sha || branch.commit_sha) && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", mt: 1, display: "block" }}>
                      {(branch.sha || branch.commit_sha).substring(0, 7)}
                    </Typography>
                  )}
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
  );
}

