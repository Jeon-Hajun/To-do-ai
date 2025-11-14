import { createTheme } from "@mui/material/styles";

// 테마 정의
export const themes = {
  light: {
    name: "라이트",
    palette: {
      primary: {
        main: "#4caf50", // 초록색
        light: "#80e27e",
        dark: "#087f23",
        contrastText: "#fff",
      },
      background: {
        default: "#f5f5f5",
        paper: "#ffffff",
      },
      text: {
        primary: "#222",
        secondary: "#555",
      },
    },
  },
  blue: {
    name: "블루",
    palette: {
      primary: {
        main: "#2196f3", // 파란색
        light: "#64b5f6",
        dark: "#1976d2",
        contrastText: "#fff",
      },
      background: {
        default: "#f5f5f5",
        paper: "#ffffff",
      },
      text: {
        primary: "#222",
        secondary: "#555",
      },
    },
  },
  dark: {
    name: "다크",
    palette: {
      primary: {
        main: "#90caf9", // 파란색
        light: "#e3f2fd",
        dark: "#42a5f5",
        contrastText: "#000",
      },
      background: {
        default: "#121212",
        paper: "#1e1e1e",
      },
      text: {
        primary: "#fff",
        secondary: "#b0b0b0",
      },
    },
  },
};

// 테마 생성 함수
export const createAppTheme = (themeName = "light") => {
  const themeConfig = themes[themeName] || themes.light;
  
  return createTheme({
    palette: {
      mode: themeName === "dark" ? "dark" : "light",
      ...themeConfig.palette,
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
};

// 기본 테마 (기존 호환성 유지)
const theme = createAppTheme("light");

export default theme;

