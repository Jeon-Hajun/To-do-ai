import { createTheme } from "@mui/material/styles";

// 색상 팔레트 정의
const colorPalettes = {
  green: {
    primary: {
      main: "#4caf50",
      light: "#80e27e",
      dark: "#087f23",
      contrastText: "#fff",
    },
    navSelected: "#fff9c4",
  },
  blue: {
    primary: {
      main: "#2196f3",
      light: "#64b5f6",
      dark: "#1976d2",
      contrastText: "#fff",
    },
    navSelected: "#b3e5fc",
  },
  purple: {
    primary: {
      main: "#9c27b0",
      light: "#ba68c8",
      dark: "#7b1fa2",
      contrastText: "#fff",
    },
    navSelected: "#f3e5f5",
  },
  orange: {
    primary: {
      main: "#ff9800",
      light: "#ffb74d",
      dark: "#f57c00",
      contrastText: "#fff",
    },
    navSelected: "#fff9c4",
  },
  pink: {
    primary: {
      main: "#e91e63",
      light: "#f48fb1",
      dark: "#c2185b",
      contrastText: "#fff",
    },
    navSelected: "#fce4ec",
  },
  red: {
    primary: {
      main: "#f44336",
      light: "#ef5350",
      dark: "#d32f2f",
      contrastText: "#fff",
    },
    navSelected: "#ffcdd2",
  },
  teal: {
    primary: {
      main: "#009688",
      light: "#4db6ac",
      dark: "#00796b",
      contrastText: "#fff",
    },
    navSelected: "#b2dfdb",
  },
  indigo: {
    primary: {
      main: "#3f51b5",
      light: "#7986cb",
      dark: "#303f9f",
      contrastText: "#fff",
    },
    navSelected: "#c5cae9",
  },
};

// 다크 모드용 색상 팔레트 (다크 모드에서는 밝은 색상 사용)
const darkColorPalettes = {
  blue: {
    primary: {
      main: "#90caf9",
      light: "#e3f2fd",
      dark: "#42a5f5",
      contrastText: "#000",
    },
    navSelected: "#fff59d",
  },
  green: {
    primary: {
      main: "#81c784",
      light: "#c8e6c9",
      dark: "#66bb6a",
      contrastText: "#000",
    },
    navSelected: "#fff59d",
  },
  purple: {
    primary: {
      main: "#ba68c8",
      light: "#e1bee7",
      dark: "#ab47bc",
      contrastText: "#000",
    },
    navSelected: "#fff59d",
  },
  orange: {
    primary: {
      main: "#ffb74d",
      light: "#ffe0b2",
      dark: "#ffa726",
      contrastText: "#000",
    },
    navSelected: "#fff59d",
  },
  pink: {
    primary: {
      main: "#f48fb1",
      light: "#fce4ec",
      dark: "#f06292",
      contrastText: "#000",
    },
    navSelected: "#fff59d",
  },
  red: {
    primary: {
      main: "#ef5350",
      light: "#ffcdd2",
      dark: "#e53935",
      contrastText: "#000",
    },
    navSelected: "#fff59d",
  },
  teal: {
    primary: {
      main: "#4db6ac",
      light: "#b2dfdb",
      dark: "#26a69a",
      contrastText: "#000",
    },
    navSelected: "#fff59d",
  },
  indigo: {
    primary: {
      main: "#7986cb",
      light: "#c5cae9",
      dark: "#5c6bc0",
      contrastText: "#000",
    },
    navSelected: "#fff59d",
  },
};

// 모드별 배경 및 텍스트 색상
const modeConfigs = {
  light: {
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
    text: {
      primary: "#222",
      secondary: "#555",
    },
  },
  dark: {
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    text: {
      primary: "#fff",
      secondary: "#b0b0b0",
    },
  },
};

// 테마 정의 (기존 호환성을 위한 매핑)
export const themes = {
  light: {
    name: "라이트",
    mode: "light",
    color: "green",
    palette: {
      ...colorPalettes.green.primary,
      navSelected: colorPalettes.green.navSelected,
      ...modeConfigs.light,
    },
  },
  blue: {
    name: "블루",
    mode: "light",
    color: "blue",
    palette: {
      ...colorPalettes.blue.primary,
      navSelected: colorPalettes.blue.navSelected,
      ...modeConfigs.light,
    },
  },
  purple: {
    name: "퍼플",
    mode: "light",
    color: "purple",
    palette: {
      ...colorPalettes.purple.primary,
      navSelected: colorPalettes.purple.navSelected,
      ...modeConfigs.light,
    },
  },
  orange: {
    name: "오렌지",
    mode: "light",
    color: "orange",
    palette: {
      ...colorPalettes.orange.primary,
      navSelected: colorPalettes.orange.navSelected,
      ...modeConfigs.light,
    },
  },
  pink: {
    name: "핑크",
    mode: "light",
    color: "pink",
    palette: {
      ...colorPalettes.pink.primary,
      navSelected: colorPalettes.pink.navSelected,
      ...modeConfigs.light,
    },
  },
  dark: {
    name: "다크",
    mode: "dark",
    color: "blue",
    palette: {
      ...darkColorPalettes.blue.primary,
      navSelected: darkColorPalettes.blue.navSelected,
      ...modeConfigs.dark,
    },
  },
};

// 사용 가능한 모드와 색상
export const themeModes = {
  light: {
    name: "라이트 모드",
    colors: {
      green: { name: "초록색" },
      blue: { name: "파란색" },
      purple: { name: "보라색" },
      orange: { name: "주황색" },
      pink: { name: "핑크색" },
      red: { name: "빨간색" },
      teal: { name: "청록색" },
      indigo: { name: "남색" },
    },
  },
  dark: {
    name: "다크 모드",
    colors: {
      blue: { name: "파란색" },
      green: { name: "초록색" },
      purple: { name: "보라색" },
      orange: { name: "주황색" },
      pink: { name: "핑크색" },
      red: { name: "빨간색" },
      teal: { name: "청록색" },
      indigo: { name: "남색" },
    },
  },
};

// 테마 생성 함수
export const createAppTheme = (mode = "light", color = "green") => {
  const modeConfig = modeConfigs[mode] || modeConfigs.light;
  const colorPalette = mode === "dark" 
    ? (darkColorPalettes[color] || darkColorPalettes.blue)
    : (colorPalettes[color] || colorPalettes.green);
  
  return createTheme({
    palette: {
      mode: mode,
      primary: colorPalette.primary,
      navSelected: colorPalette.navSelected,
      background: modeConfig.background,
      text: modeConfig.text,
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

// 기존 테마 이름을 새 형식으로 변환하는 함수
export const parseThemeName = (themeName) => {
  // 기존 형식 지원 (하위 호환성)
  if (themeName === "dark") {
    return { mode: "dark", color: "blue" };
  }
  if (themes[themeName]) {
    return { mode: themes[themeName].mode, color: themes[themeName].color };
  }
  
  // 새 형식: "light-green", "dark-blue" 등
  const [mode, color] = themeName.split("-");
  if (mode && color && (mode === "light" || mode === "dark")) {
    return { mode, color };
  }
  
  // 기본값
  return { mode: "light", color: "green" };
};

// 테마 이름을 문자열로 변환하는 함수
export const formatThemeName = (mode, color) => {
  return `${mode}-${color}`;
};

// 기본 테마 (기존 호환성 유지)
const theme = createAppTheme("light", "green");

export default theme;
