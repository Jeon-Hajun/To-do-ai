import React, { useRef, useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useTheme } from "@mui/material/styles";

/**
 * 카테고리 바 컴포넌트
 * 프로젝트나 카테고리 목록을 가로 스크롤 가능한 바 형태로 표시합니다.
 * 
 * @param {Array} items - 표시할 항목 배열 [{ id, label, ... }]
 * @param {number|string} selectedId - 현재 선택된 항목의 ID
 * @param {function} onSelect - 항목 선택 시 호출되는 함수 (id) => void
 * @param {string} title - 바의 제목 (선택사항)
 * @param {boolean} loading - 로딩 상태
 * @param {string} emptyMessage - 항목이 없을 때 표시할 메시지
 */
export default function CategoryBar({
  items = [],
  selectedId = null,
  onSelect,
  title = null,
  loading = false,
  emptyMessage = "항목이 없습니다.",
}) {
  const theme = useTheme();
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollButtons);
      window.addEventListener("resize", checkScrollButtons);
      return () => {
        container.removeEventListener("scroll", checkScrollButtons);
        window.removeEventListener("resize", checkScrollButtons);
      };
    }
  }, [items]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        position: "relative",
      }}
    >
      {title && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ position: "relative" }}>
          {/* 왼쪽 화살표 */}
          <IconButton
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            size="small"
            sx={{
              flexShrink: 0,
              bgcolor: "background.paper",
              boxShadow: 1,
              "&:hover": {
                bgcolor: "action.hover",
              },
              "&.Mui-disabled": {
                opacity: 0.3,
              },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          {/* 스크롤 가능한 프로젝트 목록 */}
          <Box
            ref={scrollContainerRef}
            sx={{
              display: "flex",
              gap: 1.5,
              flexWrap: "nowrap",
              overflowX: "auto",
              overflowY: "hidden",
              flex: 1,
              pt: 0.5,
              pb: 0.5,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >
            {items.map((item) => (
              <Chip
                key={item.id}
                label={item.label}
                onClick={() => onSelect && onSelect(item.id)}
                color={selectedId === item.id ? "primary" : "default"}
                variant={selectedId === item.id ? "filled" : "outlined"}
                sx={{
                  cursor: "pointer",
                  fontWeight: selectedId === item.id ? 600 : 500,
                  fontSize: "0.95rem",
                  height: "44px",
                  px: 2.5,
                  py: 0.5,
                  flexShrink: 0,
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 2,
                  },
                }}
              />
            ))}
          </Box>

          {/* 오른쪽 화살표 */}
          <IconButton
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            size="small"
            sx={{
              flexShrink: 0,
              bgcolor: "background.paper",
              boxShadow: 1,
              "&:hover": {
                bgcolor: "action.hover",
              },
              "&.Mui-disabled": {
                opacity: 0.3,
              },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      )}
    </Paper>
  );
}

