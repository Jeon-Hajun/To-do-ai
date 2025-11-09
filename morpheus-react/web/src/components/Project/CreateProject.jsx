import React, { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { createProject } from '../../api/projects';

export default function CreateProject({ onCreateSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!title) {
      setError('프로젝트 제목을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await createProject({ title, description });
      if (res.success) {
        if (onCreateSuccess && typeof onCreateSuccess === 'function') {
          onCreateSuccess(res.data); // 부모에게 전달
        }
      } else {
        setError(res.error?.message || '프로젝트 생성 실패');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || '서버 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Input
        placeholder="프로젝트 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input
        placeholder="설명 (선택)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <div style={{ color: 'red', fontSize: '0.9rem' }}>{error}</div>}
      <Button type="submit" disabled={loading}>
        {loading ? '생성 중...' : '프로젝트 생성'}
      </Button>
    </form>
  );
}
