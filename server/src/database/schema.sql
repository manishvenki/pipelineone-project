-- Pipeline One: PostgreSQL Database Schema
-- Ensures UUID generation support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Connected Integrations Table (GitHub, Docker Hub, Jenkins, Vercel)
CREATE TABLE IF NOT EXISTS connected_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255),
    provider_username VARCHAR(255),
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT,
    scopes TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_user ON connected_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON connected_integrations(provider);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('github', 'zip')),
    project_type VARCHAR(100) NOT NULL DEFAULT 'Static HTML/CSS/JS',
    framework VARCHAR(100),
    build_command VARCHAR(255),
    output_directory VARCHAR(255) DEFAULT 'dist',
    storage_path TEXT,
    status VARCHAR(50) DEFAULT 'ready',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_project_slug UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- 4. Project Repositories Table (Associated GitHub Repository Details)
CREATE TABLE IF NOT EXISTS project_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    repo_id BIGINT,
    owner VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    default_branch VARCHAR(100) DEFAULT 'main',
    selected_branch VARCHAR(100) DEFAULT 'main',
    clone_url TEXT,
    is_private BOOLEAN DEFAULT false,
    last_commit_sha VARCHAR(100),
    last_commit_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_repos_project ON project_repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_repos_fullname ON project_repositories(full_name);

-- 5. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(50) DEFAULT 'dark',
    notifications_enabled BOOLEAN DEFAULT true,
    auto_deploy_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- 6. Activity Records Table
CREATE TABLE IF NOT EXISTS activity_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_time ON activity_records(user_id, created_at DESC);

-- 7. Docker Builds Table (Phase 2)
CREATE TABLE IF NOT EXISTS docker_builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    image_name VARCHAR(255) NOT NULL,
    image_tag VARCHAR(100) NOT NULL DEFAULT 'latest',
    dockerfile_content TEXT,
    build_args JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    exit_code INTEGER,
    error_summary TEXT,
    log_file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docker_builds_user ON docker_builds(user_id);
CREATE INDEX IF NOT EXISTS idx_docker_builds_project ON docker_builds(project_id);
CREATE INDEX IF NOT EXISTS idx_docker_builds_created ON docker_builds(created_at DESC);

-- 8. Docker Images Table (Phase 2)
CREATE TABLE IF NOT EXISTS docker_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docker_build_id UUID REFERENCES docker_builds(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registry VARCHAR(255) DEFAULT 'docker.io',
    repository VARCHAR(255) NOT NULL,
    tag VARCHAR(100) NOT NULL,
    digest VARCHAR(255),
    size_bytes BIGINT,
    pushed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docker_images_user ON docker_images(user_id);
CREATE INDEX IF NOT EXISTS idx_docker_images_repo ON docker_images(repository);

-- 9. Integration Verification Events (Phase 2)
CREATE TABLE IF NOT EXISTS integration_verification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_user_provider ON integration_verification_events(user_id, provider, created_at DESC);

-- 10. Platform Connection Metadata (Phase 2)
CREATE TABLE IF NOT EXISTS platform_connection_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_provider_meta UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_platform_metadata_user ON platform_connection_metadata(user_id);

