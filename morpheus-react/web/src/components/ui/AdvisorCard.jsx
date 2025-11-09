// src/components/ui/AdvisorCard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useTheme, useMediaQuery } from "@mui/material";

export default function AdvisorCard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState(null);

  const isSmall = useMediaQuery(theme.breakpoints.down("sm")); // 모바일 대응

  const descriptions = {
    option1: "옵션 1을 선택하셨습니다. 이 옵션은 A 기능에 적합합니다.",
    option2: "옵션 2를 선택하셨습니다. 이 옵션은 B 기능에 적합합니다.",
  };

  const handleToggleChange = (event, newValue) => {
    if (newValue !== null) setSelectedOption(newValue);
  };

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 4 }}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: theme.shape.borderRadius,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <CardContent>
          <Typography
            variant="body1"
            sx={{ mb: 3, color: theme.palette.text.primary }}
          >
            {selectedOption
              ? descriptions[selectedOption]
              : "원하는 옵션을 선택하면 설명이 표시됩니다."}
          </Typography>

          {/* ToggleButtonGroup */}
          <ToggleButtonGroup
            value={selectedOption}
            exclusive
            onChange={handleToggleChange}
            fullWidth
            size={isSmall ? "small" : "medium"}
            sx={{
              mb: 3,
              display: "flex",
              gap: 1.5, // 버튼 사이 간격
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontWeight: 600,
                borderRadius: theme.shape.borderRadius,
                flex: 1, // 버튼 동일 너비
              },
              "& .Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "#fff",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
              },
            }}
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
              if (selectedOption === "option1") navigate("/ai-next-step");
              else if (selectedOption === "option2") navigate("/normal-next-step");
            }}
            sx={{ borderRadius: theme.shape.borderRadius }}
          >
            계속하기
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
