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
        fontSize: { xs: "0.8rem", md: "0.875rem" },
        lineHeight: { xs: 1.4, md: 1.5 },
        wordBreak: "break-word",
        overflowWrap: "break-word",
        "& p": {
          margin: 0,
          marginBottom: { xs: 0.5, md: 1 },
          fontSize: "inherit",
          "&:last-child": {
            marginBottom: 0,
          },
        },
        "& ul, & ol": {
          margin: 0,
          paddingLeft: { xs: 1.5, md: 2 },
          marginBottom: { xs: 0.5, md: 1 },
        },
        "& li": {
          marginBottom: { xs: 0.25, md: 0.5 },
          fontSize: "inherit",
        },
        "& code": {
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          padding: "2px 4px",
          borderRadius: "3px",
          fontFamily: "monospace",
          fontSize: { xs: "0.75em", md: "0.9em" },
        },
        "& pre": {
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          padding: { xs: 0.5, md: 1 },
          borderRadius: 1,
          overflow: "auto",
          marginBottom: { xs: 0.5, md: 1 },
          fontSize: { xs: "0.75em", md: "0.9em" },
          "& code": {
            backgroundColor: "transparent",
            padding: 0,
          },
        },
        "& blockquote": {
          borderLeft: "3px solid",
          borderColor: "divider",
          paddingLeft: { xs: 1, md: 2 },
          marginLeft: 0,
          marginBottom: { xs: 0.5, md: 1 },
          fontStyle: "italic",
          fontSize: "inherit",
        },
        "& a": {
          color: "primary.main",
          textDecoration: "none",
          fontSize: "inherit",
          "&:hover": {
            textDecoration: "underline",
          },
        },
        "& h1": {
          marginTop: { xs: 0.5, md: 1 },
          marginBottom: { xs: 0.25, md: 0.5 },
          fontWeight: "bold",
          fontSize: { xs: "1.25rem", md: "1.5rem" },
        },
        "& h2": {
          marginTop: { xs: 0.5, md: 1 },
          marginBottom: { xs: 0.25, md: 0.5 },
          fontWeight: "bold",
          fontSize: { xs: "1.125rem", md: "1.25rem" },
        },
        "& h3": {
          marginTop: { xs: 0.5, md: 1 },
          marginBottom: { xs: 0.25, md: 0.5 },
          fontWeight: "bold",
          fontSize: { xs: "1rem", md: "1.125rem" },
        },
        "& h4, & h5, & h6": {
          marginTop: { xs: 0.5, md: 1 },
          marginBottom: { xs: 0.25, md: 0.5 },
          fontWeight: "bold",
          fontSize: { xs: "0.9rem", md: "1rem" },
        },
        "& table": {
          borderCollapse: "collapse",
          width: "100%",
          marginBottom: { xs: 0.5, md: 1 },
          fontSize: { xs: "0.75rem", md: "0.875rem" },
        },
        "& th, & td": {
          border: "1px solid",
          borderColor: "divider",
          padding: { xs: "4px", md: "8px" },
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

