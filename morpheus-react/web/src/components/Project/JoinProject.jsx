import React, { useState } from "react";
import { joinProjectByCode } from "../../api/projects";
import Card from "../ui/Card";
import Button from "../ui/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";

export default function JoinProject({ onJoin }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleJoin = async () => {
    if (!code || !name) {
      setError("프로젝트 코드와 이름을 입력해주세요.");
      return;
    }
    try {
      const project = await joinProjectByCode(code, name);
      onJoin(project);
    } catch (err) {
      setError(err.message || "참가 실패");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card title="프로젝트 참가" sx={{ width: 400, p: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="프로젝트 코드 입력"
            variant="outlined"
            fullWidth
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <TextField
            label="프로젝트에서 보여질 이름"
            variant="outlined"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <div style={{ color: "red" }}>{error}</div>}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button type="default" onClick={() => onJoin(null)}>취소</Button>
            <Button type="default" onClick={handleJoin}>참가</Button>
          </Stack>
        </Stack>
      </Card>
    </div>
  );
}
