import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

/**
 * Diff 뷰어 컴포넌트
 * patch 문자열을 파싱하여 diff를 시각적으로 표시합니다.
 */
export default function DiffViewer({ patch, filePath }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!patch) {
    return (
      <Box 
        sx={{ p: { xs: 1, md: 2 }, bgcolor: "#f5f5f5", borderRadius: 1 }}
        style={{ backgroundColor: "#f5f5f5" }} // 인라인 스타일로 강제 적용
      >
        <Typography 
          variant="body2" 
          sx={{ fontSize: { xs: "0.75rem", md: "0.875rem" }, color: "#757575" }}
          style={{ color: "#757575" }} // 인라인 스타일로 강제 적용
        >
          변경 내용이 없습니다. (이미지 파일 등)
        </Typography>
      </Box>
    );
  }

  // patch 문자열을 라인별로 분리
  const lines = patch.split("\n");
  const parsedLines = [];
  let oldLineNum = null;
  let newLineNum = null;

  // 첫 번째 라인에서 범위 정보 추출 (예: "@@ -1,44 +1,90 @@")
  const headerMatch = lines[0]?.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  if (headerMatch) {
    oldLineNum = parseInt(headerMatch[1]) || 1;
    newLineNum = parseInt(headerMatch[3]) || 1;
  }

  // 각 라인 파싱
  lines.forEach((line, index) => {
    if (index === 0 && line.startsWith("@@")) {
      // 헤더 라인
      parsedLines.push({
        type: "header",
        content: line,
        oldLine: null,
        newLine: null,
      });
      return;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      // 추가된 라인 (녹색)
      parsedLines.push({
        type: "added",
        content: line.substring(1), // '+' 제거
        oldLine: null,
        newLine: newLineNum++,
      });
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      // 삭제된 라인 (빨간색)
      parsedLines.push({
        type: "removed",
        content: line.substring(1), // '-' 제거
        oldLine: oldLineNum++,
        newLine: null,
      });
    } else if (line.startsWith(" ")) {
      // 컨텍스트 라인 (변경 없음)
      parsedLines.push({
        type: "context",
        content: line.substring(1), // 공백 제거
        oldLine: oldLineNum++,
        newLine: newLineNum++,
      });
    } else if (line.startsWith("\\")) {
      // 파일 끝 표시
      parsedLines.push({
        type: "meta",
        content: line,
        oldLine: null,
        newLine: null,
      });
    } else {
      // 기타 (파일명 등)
      parsedLines.push({
        type: "meta",
        content: line,
        oldLine: null,
        newLine: null,
      });
    }
  });

  return (
    <Box
      sx={{
        border: "1px solid",
        borderRadius: 1,
        overflow: "hidden",
        fontFamily: "monospace",
        fontSize: { xs: "0.7rem", sm: "0.8rem", md: "0.875rem" },
      }}
      style={{ 
        backgroundColor: "#ffffff", 
        borderColor: "#e0e0e0",
        border: "1px solid #e0e0e0"
      }} // 인라인 스타일로 강제 적용 (최우선)
    >
      {/* 파일 경로 표시 */}
      {filePath && (
        <Box
          sx={{
            px: { xs: 1, md: 2 },
            py: { xs: 0.75, md: 1 },
            overflowX: "auto",
          }}
          style={{ 
            backgroundColor: "#f5f5f5", 
            borderBottom: "1px solid #e0e0e0",
            borderColor: "#e0e0e0"
          }} // 인라인 스타일로 강제 적용 (최우선)
        >
          <Typography 
            variant="caption" 
            sx={{ 
              fontFamily: "monospace",
              fontSize: { xs: "0.65rem", md: "0.75rem" },
              wordBreak: "break-all",
            }}
            style={{ color: "#424242" }} // 인라인 스타일로 강제 적용 (최우선)
          >
            {filePath}
          </Typography>
        </Box>
      )}

      {/* Diff 라인들 */}
      <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {parsedLines.map((line, index) => {
          let bgColor = "#ffffff"; // 기본 배경색: 흰색
          let textColor = "#212121"; // 기본 텍스트 색상: 어두운 회색
          let hasBorder = false;
          let borderLeftColorValue = undefined;

          if (line.type === "added") {
            // 매우 연한 녹색 배경 + 진한 녹색 텍스트
            bgColor = "rgba(76, 175, 80, 0.06)"; // 매우 연한 녹색 (6%)
            textColor = "rgb(27, 94, 32)"; // 진한 녹색 텍스트
            hasBorder = true;
            borderLeftColorValue = "rgba(76, 175, 80, 0.25)"; // 연한 녹색 테두리
          } else if (line.type === "removed") {
            // 매우 연한 빨간색 배경 + 진한 빨간색 텍스트
            bgColor = "rgba(244, 67, 54, 0.06)"; // 매우 연한 빨간색 (6%)
            textColor = "rgb(183, 28, 28)"; // 진한 빨간색 텍스트
            hasBorder = true;
            borderLeftColorValue = "rgba(244, 67, 54, 0.25)"; // 연한 빨간색 테두리
          } else if (line.type === "header") {
            bgColor = "#e3f2fd"; // 테마와 무관하게 연한 파란색 배경 고정
            textColor = "#1565c0"; // 테마와 무관하게 진한 파란색 텍스트 고정
          } else if (line.type === "meta") {
            bgColor = "#fafafa"; // 테마와 무관하게 매우 연한 회색 배경 고정
            textColor = "#757575"; // 테마와 무관하게 회색 텍스트 고정
          } else if (line.type === "context") {
            bgColor = "#ffffff"; // 테마와 무관하게 흰색 배경 고정
            textColor = "#212121"; // 테마와 무관하게 어두운 텍스트 고정
          }

          const hoverBgColor = line.type === "context" 
            ? "#f5f5f5" 
            : (line.type === "added" 
              ? "rgba(76, 175, 80, 0.08)" 
              : line.type === "removed" 
                ? "rgba(244, 67, 54, 0.08)" 
                : bgColor);

          return (
            <Box
              key={index}
              sx={{
                display: "flex",
                borderLeft: hasBorder ? { xs: "2px solid", md: "3px solid" } : "none",
                borderLeftColor: borderLeftColorValue,
              }}
              style={{ 
                backgroundColor: bgColor,
                borderLeftColor: borderLeftColorValue
              }} // 인라인 스타일로 강제 적용 (최우선)
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = hoverBgColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = bgColor;
              }}
            >
              {/* 라인 번호 (왼쪽) - 모바일/태블릿에서는 숨김 */}
              {!isMobile && (
                <Box
                  sx={{
                    minWidth: 60,
                    px: 1,
                    py: 0.5,
                    textAlign: "right",
                    fontSize: "0.75rem",
                    userSelect: "none",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                  style={{ 
                    backgroundColor: "#f5f5f5", 
                    color: "#757575",
                    borderRight: "1px solid #e0e0e0"
                  }} // 인라인 스타일로 강제 적용 (최우선)
                >
                  {line.oldLine !== null ? line.oldLine : ""}
                </Box>
              )}

              {/* 라인 번호 (오른쪽) - 모바일/태블릿에서는 숨김 */}
              {!isMobile && (
                <Box
                  sx={{
                    minWidth: 60,
                    px: 1,
                    py: 0.5,
                    textAlign: "right",
                    fontSize: "0.75rem",
                    userSelect: "none",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                  style={{ 
                    backgroundColor: "#f5f5f5", 
                    color: "#757575",
                    borderRight: "1px solid #e0e0e0"
                  }} // 인라인 스타일로 강제 적용 (최우선)
                >
                  {line.newLine !== null ? line.newLine : ""}
                </Box>
              )}

              {/* 라인 내용 */}
              <Box
                component="pre"
                sx={{
                  flex: 1,
                  px: { xs: 1, sm: 1.5, md: 2 },
                  py: { xs: 0.25, md: 0.5 },
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  minWidth: 0, // flex item이 축소될 수 있도록
                  margin: 0, // 기본 margin 제거
                  fontFamily: "monospace", // 폰트 고정
                }}
                style={{ 
                  color: textColor, 
                  backgroundColor: "transparent"
                }} // 인라인 스타일로 강제 적용 (최우선)
              >
                {line.type === "added" && "+"}
                {line.type === "removed" && "-"}
                {line.type === "context" && " "}
                {line.content}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}



