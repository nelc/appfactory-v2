const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'app-factory-v2-portal' });
});

// API endpoint to generate prompt
app.post('/api/generate-prompt', (req, res) => {
  try {
    const { appName, features, needsDB, needsFiles } = req.body;

    // Validation
    if (!appName || !appName.trim()) {
      return res.status(400).json({ 
        error: 'App name is required',
        field: 'appName' 
      });
    }

    if (!features || !Array.isArray(features) || features.length === 0) {
      return res.status(400).json({ 
        error: 'At least one feature is required',
        field: 'features' 
      });
    }

    // Generate the prompt
    const prompt = buildPrompt(
      appName.trim(), 
      features.map(f => f.trim()).filter(f => f),
      Boolean(needsDB),
      Boolean(needsFiles)
    );

    res.json({ 
      success: true,
      prompt,
      metadata: {
        appName: appName.trim(),
        featuresCount: features.length,
        needsDB: Boolean(needsDB),
        needsFiles: Boolean(needsFiles),
        version: 'v2'
      }
    });
  } catch (error) {
    console.error('Error generating prompt:', error);
    res.status(500).json({ 
      error: 'Failed to generate prompt',
      message: error.message 
    });
  }
});

// FIXED Prompt generation logic
function buildPrompt(appName, features, needsDB, needsFiles) {
  const featureList = features.map(f => `- ${f}`).join('\n');
  const repoName = appName.toLowerCase().replace(/\s+/g, '-');

  return `🚀 NELC App Factory V2 - Simplified Deployment 🚀

IMPORTANT: This generates a production-ready app that deploys to GCP Cloud Run with:
${needsDB ? '✅ Shared PostgreSQL database (auto-configured)\n' : ''}${needsFiles ? '✅ Shared Cloud Storage (auto-configured)\n' : ''}✅ HTTPS with SSL certificate
✅ Custom domain: ${repoName}.futurex.sa

═══════════════════════════════════════════════════════════

📋 APPLICATION REQUIREMENTS

App Name: ${appName}
Repository: ${repoName}

Features to implement:
${featureList}

Tech Stack (LOCKED - DO NOT CHANGE):
- Frontend: React 18 + Vite
- Backend: Node.js 20 + Express
- Database: ${needsDB ? 'PostgreSQL (shared Cloud SQL)' : 'None'}
- Storage: ${needsFiles ? 'Cloud Storage (shared bucket)' : 'None'}

═══════════════════════════════════════════════════════════

🎯 STEP-BY-STEP INSTRUCTIONS

STEP 1: Create directory structure in ~/${repoName}/

\`\`\`bash
mkdir -p ~/${repoName}/{backend,frontend,.github/workflows}
cd ~/${repoName}
\`\`\`

STEP 2: Create all files (see templates below)

STEP 3: Make deploy.sh executable:
\`\`\`bash
chmod +x ~/${repoName}/deploy.sh
\`\`\`

STEP 4: Show file tree to verify all files exist:
\`\`\`bash
tree ~/${repoName} -L 3
\`\`\`

STEP 5: Inform user to run deployment:
\`\`\`bash
cd ~/${repoName}
./deploy.sh
\`\`\`

The deploy.sh script will:
- Initialize git repository
- Create GitHub repo in nelc organization
- Push code and trigger deployment
- Show DNS configuration at the end

═══════════════════════════════════════════════════════════

📁 FILE TEMPLATES

──────────────────────────────────────────────────────────
FILE: backend/package.json
──────────────────────────────────────────────────────────
\`\`\`json
{
  "name": "${repoName}-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"${needsDB ? ',\n    "pg": "^8.11.3"' : ''}${needsFiles ? ',\n    "@google-cloud/storage": "^7.7.0"' : ''}
  }
}
\`\`\`

──────────────────────────────────────────────────────────
FILE: backend/index.js
──────────────────────────────────────────────────────────
\`\`\`javascript
import express from 'express';
import cors from 'cors';
${needsDB ? "import { pool } from './db.js';" : ''}
${needsFiles ? "import { uploadFile, listFiles } from './storage.js';" : ''}

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  const health = { status: 'ok', timestamp: new Date().toISOString() };
  
  ${needsDB ? `try {
    await pool.query('SELECT 1');
    health.database = 'connected';
  } catch (error) {
    health.status = 'error';
    health.database = error.message;
  }` : ''}
  
  res.json(health);
});

// TODO: Implement your feature endpoints here
// Example:
// app.get('/api/items', async (req, res) => { ... });
// app.post('/api/items', async (req, res) => { ... });

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`✅ Backend running on port \${PORT}\`);
});
\`\`\`

${needsDB ? `──────────────────────────────────────────────────────────
FILE: backend/db.js
──────────────────────────────────────────────────────────
\`\`\`javascript
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST || '10.66.0.3',
  port: 5432,
  database: process.env.DB_NAME || '${repoName.replace(/-/g, '_')}_db',
  user: process.env.DB_USER || 'appfactory_user',
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Initialize database tables
const initDB = async () => {
  try {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`);
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database init failed:', error.message);
  }
};

initDB();

export { pool };
\`\`\`
` : ''}

${needsFiles ? `──────────────────────────────────────────────────────────
FILE: backend/storage.js
──────────────────────────────────────────────────────────
\`\`\`javascript
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucketName = process.env.STORAGE_BUCKET || 'nelc-app-factory-bucket';
const bucket = storage.bucket(bucketName);

export async function uploadFile(fileBuffer, filename) {
  const blob = bucket.file(\`${repoName}/\${Date.now()}-\${filename}\`);
  await blob.save(fileBuffer);
  return blob.publicUrl();
}

export async function listFiles() {
  const [files] = await bucket.getFiles({ prefix: '${repoName}/' });
  return files.map(f => ({ name: f.name, size: f.metadata.size }));
}
\`\`\`
` : ''}

──────────────────────────────────────────────────────────
FILE: frontend/package.json
──────────────────────────────────────────────────────────
\`\`\`json
{
  "name": "${repoName}-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "node server.js",
    "gcp-build": "npm run build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
\`\`\`

──────────────────────────────────────────────────────────
FILE: frontend/server.js
──────────────────────────────────────────────────────────
\`\`\`javascript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - all routes return index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`✅ Frontend server running on port \${PORT}\`);
});
\`\`\`

──────────────────────────────────────────────────────────
FILE: frontend/index.html
──────────────────────────────────────────────────────────
\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
\`\`\`

──────────────────────────────────────────────────────────
FILE: frontend/vite.config.js
──────────────────────────────────────────────────────────
\`\`\`javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
\`\`\`

──────────────────────────────────────────────────────────
FILE: frontend/src/main.jsx
──────────────────────────────────────────────────────────
\`\`\`jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
\`\`\`

──────────────────────────────────────────────────────────
FILE: frontend/src/App.jsx
──────────────────────────────────────────────────────────
\`\`\`jsx
import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="App">
      <h1>${appName}</h1>
      <p>Status: {health?.status || 'Loading...'}</p>
      
      {/* TODO: Implement your UI based on features */}
      <div>
        <h2>Features to implement:</h2>
        <ul>
          ${features.map(f => `<li>${f}</li>`).join('\n          ')}
        </ul>
      </div>
    </div>
  );
}

export default App;
\`\`\`

──────────────────────────────────────────────────────────
FILE: frontend/src/App.css
──────────────────────────────────────────────────────────
\`\`\`css
.App {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
\`\`\`

──────────────────────────────────────────────────────────
FILE: frontend/src/index.css
──────────────────────────────────────────────────────────
\`\`\`css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}
\`\`\`

──────────────────────────────────────────────────────────
FILE: .github/workflows/deploy.yml
──────────────────────────────────────────────────────────
\`\`\`yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  PROJECT_ID: app-sandbox-factory
  REGION: me-central2
  CLOUD_SQL_IP: 10.66.0.3
  STORAGE_BUCKET: nelc-app-factory-bucket

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/621571041797/locations/global/workloadIdentityPools/nelc-github-pool/providers/nelc-github-pool-provider
          service_account: app-factory-sa@app-sandbox-factory.iam.gserviceaccount.com

      - uses: google-github-actions/setup-gcloud@v2

      - name: Deploy
        run: |
          APP_NAME="\${GITHUB_REPOSITORY##*/}"
          
          echo "🚀 Deploying \$APP_NAME..."
          
          ${needsDB ? `# Create database (idempotent)
          gcloud sql databases create \${APP_NAME//-/_}_db \\
            --instance=lovable-test-db \\
            --project=\$PROJECT_ID 2>/dev/null || echo "Database exists"
          ` : ''}
          
          # Deploy backend
          gcloud run deploy \${APP_NAME}-be \\
            --source ./backend \\
            --region \$REGION \\
            --project \$PROJECT_ID \\
            --service-account app-factory-sa@app-sandbox-factory.iam.gserviceaccount.com \\
            --vpc-connector run-vpc-me-central2 \\
            --vpc-egress private-ranges-only \\${needsDB ? `
            --set-env-vars DB_HOST=\$CLOUD_SQL_IP,DB_NAME=\${APP_NAME//-/_}_db,DB_USER=appfactory_user \\
            --set-secrets DB_PASSWORD=appfactory-db-password:latest \\` : ''}${needsFiles ? `
            --set-env-vars STORAGE_BUCKET=\$STORAGE_BUCKET \\` : ''}
            --ingress internal-and-cloud-load-balancing \\
            --allow-unauthenticated \\
            --quiet
          
          # Deploy frontend  
          gcloud run deploy \${APP_NAME}-fe \\
            --source ./frontend \\
            --region \$REGION \\
            --project \$PROJECT_ID \\
            --ingress internal-and-cloud-load-balancing \\
            --allow-unauthenticated \\
            --quiet
          
          # Add to load balancer
          bash <(curl -s https://raw.githubusercontent.com/nelc/appfactory-v2/main/scripts/add-to-lb.sh) \$APP_NAME
          
          echo ""
          echo "✅ Deployment complete!"
          echo ""
          echo "📋 MANUAL STEP REQUIRED:"
          echo "Add this DNS record in Cloudflare:"
          echo ""
          echo "  Type: A"
          echo "  Name: \${APP_NAME}.futurex.sa"
          echo "  Value: [LB_IP from script output above]"
          echo "  TTL: Auto"
          echo ""
          echo "Once DNS propagates (1-5 minutes):"
          echo "https://\${APP_NAME}.futurex.sa"
\`\`\`

──────────────────────────────────────────────────────────
FILE: .gitignore
──────────────────────────────────────────────────────────
\`\`\`
node_modules/
dist/
.env
.DS_Store
\`\`\`

──────────────────────────────────────────────────────────
FILE: deploy.sh
──────────────────────────────────────────────────────────
\`\`\`bash
#!/bin/bash
set -e

APP_NAME=\$(basename \$(pwd))

echo "🚀 Deploying \$APP_NAME to GCP..."
echo ""

# Check if gh is installed
if ! command -v gh >/dev/null 2>&1; then
    echo "❌ GitHub CLI not found. Run setup first:"
    echo "   curl -fsSL https://raw.githubusercontent.com/nelc/appfactory-v2-mcp/main/setup.sh | bash"
    exit 1
fi

# Initialize git if needed
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - \$APP_NAME"
fi

# Create GitHub repo and push
echo "📤 Creating GitHub repository: nelc/\$APP_NAME..."
gh repo create nelc/\$APP_NAME --private --source=. --push 2>/dev/null || {
    echo "   Repository may already exist, pushing to main..."
    git remote add origin https://github.com/nelc/\$APP_NAME.git 2>/dev/null || true
    git push -u origin main
}

echo ""
echo "✅ Code pushed! Deployment starting..."
echo ""
echo "📊 Watch deployment:"
echo "   gh run watch --repo nelc/\$APP_NAME"
echo ""
echo "Or visit:"
echo "   https://github.com/nelc/\$APP_NAME/actions"
echo ""
echo "⏱️  Deployment takes ~5 minutes"
echo "📋 DNS instructions will be shown at the end"
echo ""
\`\`\`

──────────────────────────────────────────────────────────
FILE: README.md
──────────────────────────────────────────────────────────
\`\`\`markdown
# ${appName}

${features.map(f => `- ${f}`).join('\n')}

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
${needsDB ? '- Database: PostgreSQL (Cloud SQL)\n' : ''}${needsFiles ? '- Storage: Cloud Storage\n' : ''}
## Quick Start

### Deploy to GCP
\\\`\\\`\\\`bash
./deploy.sh
\\\`\\\`\\\`

After deployment, add the DNS record shown in the output.

### Local Development

\\\`\\\`\\\`bash
# Backend
cd backend
npm install
npm start

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
\\\`\\\`\\\`

Visit: http://localhost:5173
\`\`\`

═══════════════════════════════════════════════════════════

✅ CHECKLIST - Verify before finishing:

□ All backend files created (package.json, index.js${needsDB ? ', db.js' : ''}${needsFiles ? ', storage.js' : ''})
□ All frontend files created (package.json, index.html, vite.config.js, src/main.jsx, src/App.jsx)
□ GitHub workflow file created (.github/workflows/deploy.yml)
□ deploy.sh script created (executable)
□ .gitignore and README.md created
□ File tree shown to user

🎯 USER INSTRUCTIONS:

Tell the user to run:
\`\`\`bash
cd ~/${repoName}
./deploy.sh
\`\`\`

The deploy.sh script will:
1. Initialize git repository
2. Create GitHub repo (nelc/${repoName})
3. Push code and trigger deployment
4. Output DNS configuration instructions

After deployment completes (~5 minutes):
- User adds DNS record in Cloudflare
- App goes live at https://${repoName}.futurex.sa
${needsDB ? '\nDatabase is automatically created and connected.' : ''}${needsFiles ? '\nCloud Storage is automatically available.' : ''}

This eliminates manual git/GitHub steps - user just runs one script!

═══════════════════════════════════════════════════════════`;
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ App Factory V2 Portal running on port ${PORT}`);
});

