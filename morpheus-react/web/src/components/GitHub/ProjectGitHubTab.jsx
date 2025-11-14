import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SyncIcon from "@mui/icons-material/Sync";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CommitIcon from "@mui/icons-material/Commit";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BugReportIcon from "@mui/icons-material/BugReport";
import { syncGitHub } from "../../api/github";
import { updateProject } from "../../api/projects";
import CommitList from "./CommitList";
import BranchList from "./BranchList";
import IssueList from "./IssueList";

/**
 * 프로젝트 GitHub 탭 컴포넌트
 * 동기화 버튼과 아코디언으로 커밋/브랜치/이슈를 표시합니다.
 */
export default function ProjectGitHubTab({ projectId, githubRepo: initialGithubRepo, hasGithubToken: initialHasGithubToken = false, isOwner, onRepoUpdate }) {
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [showRepoInput, setShowRepoInput] = useState(false);
  const [githubRepoInput, setGithubRepoInput] = useState(initialGithubRepo || "");
  const [githubTokenInput, setGithubTokenInput] = useState("");
  const [githubRepo, setGithubRepo] = useState(initialGithubRepo || "");
  const [hasGithubToken, setHasGithubToken] = useState(initialHasGithubToken);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);

  // initialGithubRepo와 initialHasGithubToken이 변경될 때 상태 업데이트
  useEffect(() => {
    setGithubRepo(initialGithubRepo || "");
    setGithubRepoInput(initialGithubRepo || "");
    setHasGithubToken(initialHasGithubToken);
  }, [initialGithubRepo, initialHasGithubToken]);

  const handleSync = async () => {
    if (!projectId) return;
    
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);
    
    try {
      const res = await syncGitHub(projectId);
      if (res.success) {
        setSyncSuccess(true);
        // 성공 후 잠시 표시하고 사라지게
        setTimeout(() => {
          setSyncSuccess(false);
        }, 3000);
      } else {
        setSyncError(res.error?.message || "동기화 실패");
      }
    } catch (err) {
      setSyncError("동기화 중 오류가 발생했습니다.");
      console.error("동기화 오류:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleEditClick = () => {
    setShowRepoInput(true);
    setGithubRepoInput(githubRepo || "");
    // 저장된 토큰이 있으면 마스킹된 형태로 표시, 없으면 빈 문자열
    setGithubTokenInput(hasGithubToken ? "••••••••••••••••" : "");
    setConnectError(null);
  };

  const handleCancelEdit = () => {
    setShowRepoInput(false);
    setGithubRepoInput(githubRepo || "");
    setGithubTokenInput("");
    setConnectError(null);
  };

  const handleConnect = async () => {
    if (!projectId || !isOwner) return;
    
    setConnecting(true);
    setConnectError(null);
    
    try {
      // PM to the AM 구조에 맞게 updateProject 사용
      const res = await updateProject({
        projectId,
        update: {
          githubRepo: githubRepoInput,
          githubToken: githubTokenInput && githubTokenInput !== "••••••••••••••••" ? githubTokenInput : undefined,
        }
      });
      
      if (res.success) {
        setGithubRepo(githubRepoInput);
        setShowRepoInput(false);
        setGithubTokenInput("");
        // 토큰이 입력되었거나 기존 토큰이 유지되면 true로 설정
        const tokenWasUpdated = githubTokenInput.trim() !== "" && 
                                 githubTokenInput !== "••••••••••••••••";
        setHasGithubToken(tokenWasUpdated || hasGithubToken);
        
        if (onRepoUpdate) {
          onRepoUpdate(githubRepoInput);
        }
        // 저장소 연결 후 자동으로 동기화
        handleSync();
      } else {
        setConnectError(res.error?.message || "저장소 연결 실패");
      }
    } catch (err) {
      setConnectError("저장소 연결 중 오류가 발생했습니다.");
      console.error("저장소 연결 오류:", err);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Box>
      {/* 상단: 저장소 연결/수정 */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">
            GitHub 저장소
          </Typography>
          {isOwner && (
            <Button
              variant={githubRepo ? "outlined" : "contained"}
              startIcon={showRepoInput ? <CloseIcon /> : <EditIcon />}
              onClick={showRepoInput ? handleCancelEdit : handleEditClick}
              size="small"
            >
              {showRepoInput ? "취소" : githubRepo ? "수정" : "연결"}
            </Button>
          )}
        </Stack>

        {/* 저장소 정보 표시 */}
        {!showRepoInput && (
          <Box>
            {githubRepo ? (
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all", mb: 2 }}>
                {githubRepo}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                저장소가 연결되지 않았습니다.
              </Typography>
            )}
          </Box>
        )}

        {/* 저장소 입력 필드 */}
        <Collapse in={showRepoInput}>
          <Stack spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="GitHub 저장소 URL"
              value={githubRepoInput}
              onChange={(e) => setGithubRepoInput(e.target.value)}
              placeholder="https://github.com/owner/repo"
              size="small"
              error={!!connectError && !githubRepoInput.trim()}
            />
            <TextField
              fullWidth
              label="GitHub Personal Access Token"
              type="password"
              value={githubTokenInput}
              onChange={(e) => {
                // 마스킹된 값이 입력되면 빈 문자열로 처리
                const value = e.target.value === "••••••••••••••••" ? "" : e.target.value;
                setGithubTokenInput(value);
              }}
              placeholder={hasGithubToken ? "새 토큰을 입력하거나 비워두면 기존 토큰 유지" : "ghp_... 또는 github_pat_..."}
              size="small"
              helperText={
                hasGithubToken 
                  ? "저장된 토큰이 있습니다. 새 토큰을 입력하거나 비워두면 기존 토큰이 유지됩니다."
                  : "Private 저장소 접근을 위해 필요합니다. 입력하지 않으면 공개 저장소만 접근 가능합니다."
              }
            />
            {connectError && (
              <Typography variant="caption" color="error" sx={{ mt: -1 }}>
                {connectError}
              </Typography>
            )}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                disabled={connecting}
              >
                취소
              </Button>
              <Button
                variant="contained"
                startIcon={connecting ? <CircularProgress size={16} /> : <CheckIcon />}
                onClick={handleConnect}
                disabled={connecting || !githubRepoInput.trim()}
                sx={{ minWidth: 100 }}
              >
                {connecting ? "연결 중..." : "저장"}
              </Button>
            </Stack>
          </Stack>
        </Collapse>

        {/* 동기화 버튼 */}
        {githubRepo && (
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
            fullWidth
            sx={{ mt: 1 }}
          >
            {syncing ? "동기화 중..." : "동기화"}
          </Button>
        )}
      </Box>

      {/* 동기화 결과 메시지 */}
      {syncSuccess && (
        <Box sx={{ p: 2, bgcolor: "success.light", borderRadius: 1, mb: 2 }}>
          <Typography color="success.dark">동기화가 완료되었습니다.</Typography>
        </Box>
      )}
      {syncError && (
        <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1, mb: 2 }}>
          <Typography color="error">{syncError}</Typography>
        </Box>
      )}

      {/* 아코디언 섹션 */}
      {githubRepo ? (
        <Box>
          {/* 이슈 */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <BugReportIcon color="primary" />
                <Typography variant="h6">이슈</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <IssueList projectId={projectId} />
            </AccordionDetails>
          </Accordion>

          {/* 브랜치 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccountTreeIcon color="primary" />
                <Typography variant="h6">브랜치</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <BranchList projectId={projectId} />
            </AccordionDetails>
          </Accordion>

          {/* 커밋 목록 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CommitIcon color="primary" />
                <Typography variant="h6">커밋 목록</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <CommitList projectId={projectId} />
            </AccordionDetails>
          </Accordion>
        </Box>
      ) : (
        <Box sx={{ p: 3, textAlign: "center", bgcolor: "grey.100", borderRadius: 1 }}>
          <Typography variant="body1" color="text.secondary">
            GitHub 저장소를 연결해주세요.
          </Typography>
        </Box>
      )}
    </Box>
  );
}



