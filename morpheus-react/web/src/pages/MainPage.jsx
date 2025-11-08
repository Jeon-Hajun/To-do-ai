import React, { useEffect } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Header from "../components/ui/Header";
import NavBar from "../components/ui/NavBar";
import TaskList from "../components/TaskList";
import ContainerBox from "../components/ui/ContainerBox";
import PageContainer from "../components/ui/PageContainer";

export default function MainPage() {
  const { user, loading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true }); // 로그인 안 되면 이동
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <ContainerBox sx={{ bgcolor: "grey.100", pb: 8 }}>
      <Header title="Home" />
      <PageContainer title="Home" subtitle="환영합니다! 오늘 할 일을 확인해보세요.">
        <TaskList />
      </PageContainer>
      <NavBar />
    </ContainerBox>
  );
}
