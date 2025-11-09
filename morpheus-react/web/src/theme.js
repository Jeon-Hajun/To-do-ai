// src/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  shape: {
    borderRadius: 4, // 기본 버튼, 카드 등 컴포넌트 모서리
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6, // 카드만 살짝 더 둥글게
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4, // 버튼은 덜 둥글게
        },
      },
    },
  },
});

export default theme;
