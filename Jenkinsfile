pipeline {
    agent any
    tools {
        nodejs "Node 14.x"
    }
    stages {
        stage('Build') {
            steps {
                labelledShell script: 'npm install', label: 'npm install'
                labelledShell script: 'npm test', label: 'npm test'
                labelledShell script: 'npm run lint', label: 'npm run lint'
            }
        }
    }
}