import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Box, Typography } from "@mui/material";

/**
 * 마크다운 텍스트를 렌더링하는 컴포넌트
 * @param {string} content - 마크다운 형식의 텍스트
 * @param {object} sx - Material-UI sx prop
 */
export default function MarkdownRenderer({ content, sx = {} }) {
  if (!content) return null;

  return (
    <Box
      sx={{
        "& p": {
          margin: 0,
          marginBottom: 1,
          "&:last-child": {
            marginBottom: 0,
          },
        },
        "& ul, & ol": {
          margin: 0,
          paddingLeft: 2,
          marginBottom: 1,
        },
        "& li": {
          marginBottom: 0.5,
        },
        "& code": {
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          padding: "2px 4px",
          borderRadius: "3px",
          fontFamily: "monospace",
          fontSize: "0.9em",
        },
        "& pre": {
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          padding: 1,
          borderRadius: 1,
          overflow: "auto",
          marginBottom: 1,
          "& code": {
            backgroundColor: "transparent",
            padding: 0,
          },
        },
        "& blockquote": {
          borderLeft: "3px solid",
          borderColor: "divider",
          paddingLeft: 2,
          marginLeft: 0,
          marginBottom: 1,
          fontStyle: "italic",
        },
        "& a": {
          color: "primary.main",
          textDecoration: "none",
          "&:hover": {
            textDecoration: "underline",
          },
        },
        "& h1, & h2, & h3, & h4, & h5, & h6": {
          marginTop: 1,
          marginBottom: 0.5,
          fontWeight: "bold",
        },
        "& table": {
          borderCollapse: "collapse",
          width: "100%",
          marginBottom: 1,
        },
        "& th, & td": {
          border: "1px solid",
          borderColor: "divider",
          padding: "8px",
        },
        "& th": {
          backgroundColor: "action.hover",
          fontWeight: "bold",
        },
        ...sx,
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </Box>
  );
}

