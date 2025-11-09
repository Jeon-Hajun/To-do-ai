// ProjectCard.jsx
import React from 'react';
import Button from '../ui/Button';

export default function ProjectCard({ project, onLeave }) {
  if (!project) return null; // 프로젝트가 없으면 아무것도 렌더링하지 않음

  const members = project.members || []; // undefined 방지

  return (
    <div style={{ border: '1px solid #ccc', padding: '12px', marginBottom: '12px' }}>
      <h3>{project.title}</h3>
      {project.description && <p>{project.description}</p>}

      <div>
        멤버: {members.length > 0 ? members.map((m) => m.nickname || m.email).join(', ') : '없음'}
      </div>

      <Button onClick={onLeave} style={{ marginTop: '8px' }}>
        나가기
      </Button>
    </div>
  );
}
