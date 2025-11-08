import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import FolderIcon from "@mui/icons-material/Folder"; // 프로젝트 아이콘 추가

export const navButtons = [
  { label: "Home", path: "/main", icon: HomeIcon }, 
  { label: "Project", path: "/project", icon: FolderIcon }, // 아이콘 변경
  { label: "AI Advisor", path: "/aiadvisor", icon: SmartToyIcon },
  { label: "Settings", path: "/settings", icon: SettingsIcon },
];
