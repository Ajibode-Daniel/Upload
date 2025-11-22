# High-Speed File Processor

A production-ready concurrent file processing system built with TypeScript, BullMQ, and PostgreSQL.

## Features
- 🚀 Concurrent file processing (CSV, PDF, Image)
- 🔄 Job queue management with BullMQ
- 🧵 Worker threads for CPU-intensive tasks
- 📊 Real-time progress tracking
- 🔁 Automatic retry with exponential backoff
- 📈 Queue metrics and monitoring

## Quick Start

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose
- Yarn package manager

### Installation

1. Clone and install dependencies:
\`\`\`bash
git clone <your-repo>
cd Upload
yarn install
\`\`\`

2. Start infrastructure:
\`\`\`bash
yarn docker:up
\`\`\`

3. Create .env file:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Build the project:
\`\`\`bash
yarn build
\`\`\`

5. Start services:
\`\`\`bash
# Terminal 1 - API
yarn dev:api

# Terminal 2 - Worker
yarn dev:worker
\`\`\`

## API Documentation

### Upload File
\`\`\`bash
POST /api/upload
Content-Type: multipart/form-data

curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.csv"
\`\`\`

### Check Task Status
\`\`\`bash
GET /api/tasks/:taskId/status
\`\`\`

### Get Task Result
\`\`\`bash
GET /api/tasks/:taskId/result
\`\`\`

### Health Check
\`\`\`bash
GET /api/tasks/health
\`\`\`

### Queue Metrics
\`\`\`bash
GET /api/tasks/metrics
\`\`\`

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup guide.

## Architecture

See architecture diagram and implementation details in the docs.

## License
MIT