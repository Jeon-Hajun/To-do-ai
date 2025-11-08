import React from "react";
import ProjectCard from "./ProjectCard";

export default function ProjectList({ projects, onSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={onSelect} // 클릭 이벤트 전달
        />
      ))}
    </div>
  );
}
