// src/components/Project/JoinProject.jsx
import React, { useState } from 'react';
import { joinProject } from '../../api/projects';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function JoinProject({ onJoin }) {
  const [projectCode, setProjectCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    if (!projectCode) {
      setError('프로젝트 코드를 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const res = await joinProject({ projectCode, password });
      if (res.success) {
        if (onJoin) onJoin(res.data); // 부모 컴포넌트로 전달
      } else {
        setError(res.error?.message || '프로젝트 참여에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Input
        placeholder="프로젝트 코드"
        value={projectCode}
        onChange={(e) => setProjectCode(e.target.value)}
      />
      <Input
        placeholder="비밀번호 (선택)"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <div style={{ color: 'red', fontSize: '0.9rem' }}>{error}</div>}
      <Button type="submit" disabled={loading}>
        {loading ? '참여 중...' : '프로젝트 참여'}
      </Button>
    </form>
  );
}
