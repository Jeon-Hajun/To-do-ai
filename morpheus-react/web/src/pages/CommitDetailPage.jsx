import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { getCommit } from "../api/githubApi";
import DiffViewer from "../components/GitHub/DiffViewer";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";

export default function CommitDetailPage() {
  const { projectId, commitSha } = useParams();
  const navigate = useNavigate();
  const [commit, setCommit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (projectId && commitSha) {
      fetchCommit();
    }
  }, [projectId, commitSha]);

  const fetchCommit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCommit(projectId, commitSha);
      if (res.success) {
        setCommit(res.data.commit);
      } else {
        setError(res.error?.message || "커밋 정보를 불러올 수 없습니다.");
      }
    } catch (err) {
      setError("커밋 정보를 불러오는 중 오류가 발생했습니다.");
      console.error("커밋 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "added":
        return "success";
      case "removed":
        return "error";
      case "modified":
        return "warning";
      case "renamed":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "added":
        return "추가됨";
      case "removed":
        return "삭제됨";
      case "modified":
        return "수정됨";
      case "renamed":
        return "이름 변경";
      default:
        return status;
    }
  };

  const handleBack = () => {
    navigate(`/project/${projectId}`);
  };

  return (
    <ContainerBox sx={{ bgcolor: "grey.100", minHeight: "100vh", pb: 8 }}>
      <Header title="커밋 상세" />
      
      <PageContainer title="커밋 상세" maxWidth="lg" sx={{ pt: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          프로젝트로 돌아가기
        </Button>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1, mb: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {commit && !loading && (
          <Box>
            {/* 커밋 헤더 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ wordBreak: "break-word" }}>
                {commit.message}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>작성자:</strong> {commit.author}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>날짜:</strong> {formatDate(commit.date)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                  <strong>SHA:</strong> {commit.sha.substring(0, 7)}
                </Typography>
              </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* 통계 정보 */}
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip
                  icon={<AddIcon />}
                  label={`+${commit.linesAdded || 0}`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<RemoveIcon />}
                  label={`-${commit.linesDeleted || 0}`}
                  color="error"
                  variant="outlined"
                />
                <Chip
                  label={`${commit.filesChanged || 0}개 파일 변경`}
                  variant="outlined"
                />
              </Stack>
            </Box>

            {/* 파일 변경 목록 */}
            {commit.files && commit.files.length > 0 ? (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  변경된 파일 ({commit.files.length}개)
                </Typography>
                {commit.files.map((file, index) => (
                  <Accordion key={index} defaultExpanded={index === 0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                        <Chip
                          label={getStatusLabel(file.status)}
                          color={getStatusColor(file.status)}
                          size="small"
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            flex: 1,
                            fontFamily: "monospace",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {file.filePath}
                        </Typography>
                        {file.additions > 0 && (
                          <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
                            +{file.additions}
                          </Typography>
                        )}
                        {file.deletions > 0 && (
                          <Typography variant="caption" color="error.main" sx={{ ml: 1 }}>
                            -{file.deletions}
                          </Typography>
                        )}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <DiffViewer patch={file.patch} filePath={file.filePath} />
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ) : (
              <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  변경된 파일이 없습니다.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </PageContainer>

      <NavBar />
    </ContainerBox>
  );
}

