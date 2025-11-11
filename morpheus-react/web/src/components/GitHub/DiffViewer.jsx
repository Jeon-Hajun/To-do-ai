import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

/**
 * Diff 뷰어 컴포넌트
 * patch 문자열을 파싱하여 diff를 시각적으로 표시합니다.
 */
export default function DiffViewer({ patch, filePath }) {
  if (!patch) {
    return (
      <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
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
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        fontFamily: "monospace",
        fontSize: "0.875rem",
      }}
    >
      {/* 파일 경로 표시 */}
      {filePath && (
        <Box
          sx={{
            bgcolor: "grey.100",
            px: 2,
            py: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
            {filePath}
          </Typography>
        </Box>
      )}

      {/* Diff 라인들 */}
      <Box sx={{ overflowX: "auto" }}>
        {parsedLines.map((line, index) => {
          let bgColor = "transparent";
          let textColor = "text.primary";
          let borderLeft = "none";
          let borderLeftColorValue = undefined;

          if (line.type === "added") {
            bgColor = "success.light";
            textColor = "success.dark";
            borderLeft = "3px solid";
            borderLeftColorValue = "success.main";
          } else if (line.type === "removed") {
            bgColor = "error.light";
            textColor = "error.dark";
            borderLeft = "3px solid";
            borderLeftColorValue = "error.main";
          } else if (line.type === "header") {
            bgColor = "info.light";
            textColor = "info.dark";
          } else if (line.type === "meta") {
            bgColor = "grey.50";
            textColor = "text.secondary";
          }

          return (
            <Box
              key={index}
              sx={{
                display: "flex",
                borderLeft,
                borderLeftColor: borderLeftColorValue,
                bgcolor: bgColor,
                "&:hover": {
                  bgcolor: line.type === "context" ? "grey.50" : bgColor,
                },
              }}
            >
              {/* 라인 번호 (왼쪽) */}
              <Box
                sx={{
                  minWidth: 60,
                  px: 1,
                  py: 0.5,
                  textAlign: "right",
                  bgcolor: "grey.100",
                  borderRight: "1px solid",
                  borderColor: "divider",
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  userSelect: "none",
                }}
              >
                {line.oldLine !== null ? line.oldLine : ""}
              </Box>

              {/* 라인 번호 (오른쪽) */}
              <Box
                sx={{
                  minWidth: 60,
                  px: 1,
                  py: 0.5,
                  textAlign: "right",
                  bgcolor: "grey.100",
                  borderRight: "1px solid",
                  borderColor: "divider",
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  userSelect: "none",
                }}
              >
                {line.newLine !== null ? line.newLine : ""}
              </Box>

              {/* 라인 내용 */}
              <Box
                sx={{
                  flex: 1,
                  px: 2,
                  py: 0.5,
                  color: textColor,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
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
    </Paper>
  );
}

