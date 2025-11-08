-- Todo AI 데이터베이스 스키마
-- MySQL Workbench에서 실행할 스크립트
-- 전체 내용을 복사해서 MySQL Workbench의 SQL Editor에서 실행하세요

-- 1. 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS todo_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 데이터베이스 선택
USE todo_ai;

-- 3. 외래 키 제약 조건 활성화
SET FOREIGN_KEY_CHECKS = 1;

-- Users 테이블
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(255) NOT NULL,
  profile_image VARCHAR(255) DEFAULT 'basic.png',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects 테이블
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_code VARCHAR(6) UNIQUE,
  password_hash VARCHAR(255),
  owner_id INT NOT NULL,
  github_repo VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_projects_owner (owner_id),
  INDEX idx_projects_code (project_code),
  INDEX idx_projects_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ProjectMembers 테이블
CREATE TABLE IF NOT EXISTS project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_user (project_id, user_id),
  INDEX idx_project_members_project (project_id),
  INDEX idx_project_members_user (user_id),
  INDEX idx_project_members_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks 테이블
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  assigned_user_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo',
  github_issue_number INT,
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tasks_project (project_id),
  INDEX idx_tasks_assigned (assigned_user_id),
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_github_issue (github_issue_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ProjectCommits 테이블
CREATE TABLE IF NOT EXISTS project_commits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  task_id INT,
  commit_sha VARCHAR(40) NOT NULL,
  commit_message TEXT,
  author VARCHAR(255),
  commit_date DATETIME,
  lines_added INT DEFAULT 0,
  lines_deleted INT DEFAULT 0,
  files_changed INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  UNIQUE KEY unique_project_commit (project_id, commit_sha),
  INDEX idx_commits_project (project_id),
  INDEX idx_commits_task (task_id),
  INDEX idx_commits_date (commit_date),
  INDEX idx_commits_sha (commit_sha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI_Logs 테이블
CREATE TABLE IF NOT EXISTS ai_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  task_id INT,
  project_id INT,
  type VARCHAR(50) NOT NULL,
  input TEXT,
  output TEXT,
  feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  INDEX idx_ai_logs_user (user_id),
  INDEX idx_ai_logs_project (project_id),
  INDEX idx_ai_logs_type (type),
  INDEX idx_ai_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
