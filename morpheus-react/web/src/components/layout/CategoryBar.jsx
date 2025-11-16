import React, { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * 드래그 가능한 탭 컴포넌트
 */
function SortableTab({ item, index, selectedIndex, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  // 세로 이동 제한: 가로 방향으로만 드래그 가능하도록
  const restrictedTransform = transform
    ? {
        ...transform,
        y: 0, // 세로 이동 제한
      }
    : null;

  const style = {
    transform: restrictedTransform ? CSS.Transform.toString(restrictedTransform) : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 전체 제목이 있으면 툴팁으로 표시
  const tooltipTitle = item.fullLabel && item.fullLabel !== item.label ? item.fullLabel : null;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        position: "relative",
      }}
    >
      <Tab
        label={item.label}
        title={tooltipTitle || undefined}
        onClick={() => onSelect && onSelect(item.id)}
        {...attributes}
        {...listeners}
        sx={{
          whiteSpace: "nowrap",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          minWidth: "auto",
          px: 2.5,
          // 드래그 시작 시 스크롤 방지
          touchAction: "none",
        }}
      />
    </Box>
  );
}

/**
 * 카테고리 바 컴포넌트
 * 프로젝트나 카테고리 목록을 Tabs 형태로 표시합니다.
 * 드래그 앤 드롭으로 순서를 변경할 수 있습니다.
 * 
 * @param {Array} items - 표시할 항목 배열 [{ id, label, ... }]
 * @param {number|string} selectedId - 현재 선택된 항목의 ID
 * @param {function} onSelect - 항목 선택 시 호출되는 함수 (id) => void
 * @param {function} onReorder - 순서 변경 시 호출되는 함수 (newOrder: string[]) => void
 * @param {string} title - 바의 제목 (선택사항)
 * @param {boolean} loading - 로딩 상태
 * @param {string} emptyMessage - 항목이 없을 때 표시할 메시지
 */
export default function CategoryBar({
  items = [],
  selectedId = null,
  onSelect,
  onReorder,
  title = null,
  loading = false,
  emptyMessage = "항목이 없습니다.",
}) {
  const tabsRef = useRef(null);
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const value = selectedIndex >= 0 ? selectedIndex : false;

  // 모바일 감지 (터치 지원 기기)
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // 0.5초 대기 후 드래그 시작 (클릭과 드래그 구분)
        delay: 500,
        tolerance: 5, // 5px 이동 허용
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 선택된 탭이 보이도록 자동 스크롤
  useEffect(() => {
    if (tabsRef.current && selectedIndex >= 0) {
      const tabsContainer = tabsRef.current.querySelector('.MuiTabs-scrollableContainer');
      const selectedTab = tabsRef.current.querySelector(`[role="tab"][aria-selected="true"]`);
      
      if (tabsContainer && selectedTab) {
        const containerRect = tabsContainer.getBoundingClientRect();
        const tabRect = selectedTab.getBoundingClientRect();
        
        // 선택된 탭이 화면 밖에 있으면 스크롤
        if (tabRect.left < containerRect.left) {
          selectedTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        } else if (tabRect.right > containerRect.right) {
          selectedTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
        }
      }
    }
  }, [selectedIndex]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      const newOrder = newItems.map((item) => item.id);
      onReorder(newOrder);
    }
  };

  const handleChange = (event, newValue) => {
    if (newValue !== false && items[newValue] && onSelect) {
      onSelect(items[newValue].id);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        py: 2,
        px: 0, // 좌우 패딩 제거 (ContainerBox의 px와 맞추기 위해)
        mb: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        mt: 2, // 위쪽 영역과 간격 추가
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
        <Box ref={tabsRef} sx={{ display: "flex", justifyContent: "center" }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={horizontalListSortingStrategy}
            >
              <Tabs
                value={value}
                onChange={handleChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  maxWidth: "fit-content",
                  mx: "auto",
                  borderBottom: 1,
                  borderColor: "divider",
                  "& .MuiTabs-indicator": {
                    height: 3,
                    borderRadius: "3px 3px 0 0",
                  },
                  "& .MuiTab-root": {
                    minHeight: 48,
                    textTransform: "none",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    px: 2.5,
                    "&.Mui-selected": {
                      fontWeight: 600,
                    },
                  },
                  "& .MuiTabs-scrollButtons": {
                    "&.Mui-disabled": {
                      opacity: 0.3,
                    },
                  },
                }}
              >
                {items.map((item, index) => (
                  <SortableTab
                    key={item.id}
                    item={item}
                    index={index}
                    selectedIndex={selectedIndex}
                    onSelect={onSelect}
                  />
                ))}
              </Tabs>
            </SortableContext>
          </DndContext>
        </Box>
      )}
    </Paper>
  );
}

