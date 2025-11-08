// src/components/ui/AdvisorCard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card"; // MUI Card
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

export default function AdvisorCard() {
  const [selectedOption, setSelectedOption] = useState(null);
  const navigate = useNavigate();

  const descriptions = {
    option1: "옵션 1을 선택하셨습니다. 이 옵션은 A 기능에 적합합니다.",
    option2: "옵션 2를 선택하셨습니다. 이 옵션은 B 기능에 적합합니다.",
  };

  const handleToggleChange = (event, newValue) => {
    if (newValue !== null) setSelectedOption(newValue);
  };

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 4 }}>
      <Card variant="outlined">
        <CardContent>
          {/* 설명 영역 */}
          <Typography variant="body1" sx={{ mb: 3 }}>
            {selectedOption
              ? descriptions[selectedOption]
              : "원하는 옵션을 선택하면 설명이 표시됩니다."}
          </Typography>

          {/* 선택 버튼 (ToggleButtonGroup) */}
          <ToggleButtonGroup
            value={selectedOption}
            exclusive
            onChange={handleToggleChange}
            fullWidth
            size="medium"
            sx={{ mb: 3 }}
          >
            <ToggleButton value="option1">AI 기반 추천, 분석</ToggleButton>
            <ToggleButton value="option2">일반 템플릿 활용</ToggleButton>
          </ToggleButtonGroup>

          {/* 계속하기 버튼 */}
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={!selectedOption}
            onClick={() => {
              if (selectedOption === "option1") {
                navigate("/ai-next-step");
              } else if (selectedOption === "option2") {
                navigate("/normal-next-step");
              }
            }}
          >
            계속하기
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
