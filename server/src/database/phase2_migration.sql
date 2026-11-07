-- Pipeline One: Phase 2 Database Migration
-- Adds tables for Docker Containerization, Verification Events, and Platform Metadata

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
