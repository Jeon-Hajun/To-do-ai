// src/components/Project/ProjectDetailTabs.jsx
import React, { useState } from "react";
import { Card, CardContent, Box, Button } from "@mui/material";
import ProjectDetailCard from "./ProjectDetailCard";
import ProjectTaskList from "./task/ProjectTaskList";

export default function ProjectDetailTabs({ projects }) {
  const [activeIndex, setActiveIndex] = useState(0); // 현재 프로젝트 인덱스
  const [activeTab, setActiveTab] = useState("detail"); // "detail" / "task"

  return (
    <Box sx={{ maxWidth: 800, margin: "auto", mt: 4 }}>
      {projects.map((proj, idx) => (
        <Box key={proj.id} sx={{ mb: 4 }}>
          {activeIndex === idx && (
            <Card sx={{ p: 0, borderRadius: 2, overflow: "hidden" }}>
              {/* 탭 버튼 */}
              <Box sx={{ display: "flex", borderBottom: 1, borderColor: "divider" }}>
                <Button
                  onClick={() => setActiveTab("detail")}
                  sx={{
                    flex: 1,
                    borderRadius: 0,
                    bgcolor: activeTab === "detail" ? "primary.main" : "grey.100",
                    color: activeTab === "detail" ? "white" : "black",
                    fontWeight: activeTab === "detail" ? "bold" : 500,
                  }}
                >
                  상세 정보
                </Button>
                <Button
                  onClick={() => setActiveTab("task")}
                  sx={{
                    flex: 1,
                    borderRadius: 0,
                    bgcolor: activeTab === "task" ? "primary.main" : "grey.100",
                    color: activeTab === "task" ? "white" : "black",
                    fontWeight: activeTab === "task" ? "bold" : 500,
                  }}
                >
                  작업 목록
                </Button>
              </Box>

              <CardContent sx={{ pt: 3 }}>
                {/* 상세 정보 / 작업 목록 탭 */}
                {activeTab === "detail" && <ProjectDetailCard project={proj} />}
                {activeTab === "task" && <ProjectTaskList projectId={proj.id} />}
              </CardContent>
            </Card>
          )}
        </Box>
      ))}
    </Box>
  );
}
