/**
 * Dynamic Jenkinsfile Generator
 * Produces secure, declarative Jenkins pipelines tailored to static website projects.
 */

export const generateJenkinsfile = (config, project) => {
  const {
    github_branch = 'main',
    install_command = '',
    build_command = '',
    output_directory = '.',
    node_version = '20',
    docker_enabled = false,
    docker_publish_enabled = false,
    docker_repository = '',
    docker_tag = 'latest',
    deployment_environment = 'production',
  } = config;

  const isPureStatic = !build_command && !install_command;
  const isNodeProject = Boolean(build_command || install_command);
  const outDir = output_directory || '.';

  return `pipeline {
    agent any

    options {
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
        ansiColor('xterm')
    }

    environment {
        PIPELINE_ONE_PROJECT_ID = '${project.id}'
        PIPELINE_ONE_PROJECT_SLUG = '${project.slug || 'static-app'}'
        DEPLOY_BRANCH = '${github_branch}'
        DEPLOY_ENV = '${deployment_environment}'
        OUTPUT_DIR = '${outDir}'
    }

    stages {
        stage('Checkout') {
            steps {
                echo "==> [Stage 1/8] Checking out repository branch: \${env.DEPLOY_BRANCH}"
                checkout scm
            }
        }

        stage('Environment Validation') {
            steps {
                echo "==> [Stage 2/8] Validating build environment"
                sh '''
                    echo "Workspace: \$(pwd)"
                    echo "Operating System: \$(uname -s || echo 'Windows')"
                    git log -1 --pretty=format:"Commit: %h - %s (%an)"
                '''
            }
        }

        stage('Project Detection & Verification') {
            steps {
                echo "==> [Stage 3/8] Verifying static entry point and directory structure"
                script {
                    def hasIndex = fileExists('index.html') || fileExists('public/index.html') || fileExists('src/index.html')
                    if (!hasIndex && !fileExists('package.json')) {
                        error("Validation failed: No index.html or package.json found in project root.")
                    }
                    echo "Static entry point structure verified."
                }
            }
        }

${isNodeProject ? `        stage('Install Dependencies') {
            steps {
                echo "==> [Stage 4/8] Installing project dependencies"
                sh '''
                    ${install_command || 'npm ci || npm install'}
                '''
            }
        }

        stage('Build Static Site') {
            steps {
                echo "==> [Stage 5/8] Compiling static assets"
                sh '''
                    ${build_command || 'npm run build'}
                '''
            }
        }` : `        stage('Static Verification') {
            steps {
                echo "==> [Stage 4-5/8] Pure HTML/CSS/JS detected. No compilation required."
                sh '''
                    ls -la
                '''
            }
        }`}

        stage('Validate Output Directory') {
            steps {
                echo "==> [Stage 6/8] Verifying production output directory: \${env.OUTPUT_DIR}"
                script {
                    def targetDir = env.OUTPUT_DIR == '.' ? '.' : env.OUTPUT_DIR
                    if (targetDir != '.' && !fileExists(targetDir)) {
                        error("Target output directory '\${targetDir}' does not exist after build execution.")
                    }
                    echo "Build output directory '\${targetDir}' successfully validated."
                }
            }
        }

${docker_enabled ? `        stage('Docker Container Build') {
            steps {
                echo "==> [Stage 7/8] Containerizing static website into production Nginx container"
                sh '''
                    docker build -t \${PIPELINE_ONE_PROJECT_SLUG}:${docker_tag || 'latest'} .
                '''
            }
        }
${docker_publish_enabled && docker_repository ? `
        stage('Docker Hub Publish') {
            steps {
                echo "==> [Stage 7.5/8] Publishing image to Docker Hub registry"
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker tag \${PIPELINE_ONE_PROJECT_SLUG}:${docker_tag || 'latest'} ${docker_repository}:${docker_tag || 'latest'}
                        docker push ${docker_repository}:${docker_tag || 'latest'}
                        docker logout
                    '''
                }
            }
        }` : ''}` : `        stage('Containerization Skipped') {
            steps {
                echo "==> [Stage 7/8] Docker containerization not enabled for this pipeline configuration."
            }
        }`}

        stage('Stage Deployment Artifact') {
            steps {
                echo "==> [Stage 8/8] Archiving validated static distribution files for Vercel deployment"
                archiveArtifacts artifacts: "\${env.OUTPUT_DIR}/**", allowEmptyArchive: false
            }
        }
    }

    post {
        success {
            echo "SUCCESS: Pipeline execution completed successfully."
        }
        failure {
            echo "ERROR: Pipeline execution failed."
        }
        always {
            cleanWs(cleanWhenNotBuilt: false,
                    deleteDirs: true,
                    notFailBuild: true)
        }
    }
}
`;
};

export default {
  generateJenkinsfile,
};

