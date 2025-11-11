import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#4caf50", // 버튼 등 주요 색
      light: "#80e27e",
      dark: "#087f23",
      contrastText: "#fff",
    },
    background: {
      default: "#f5f5f5", // 전체 배경
      paper: "#ffffff",    // 카드 배경
    },
    text: {
      primary: "#222",
      secondary: "#555",
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: "none",
        },
      },
    },
  },
});

export default theme;
