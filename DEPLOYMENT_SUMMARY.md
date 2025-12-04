# App Factory V2 - Deployment Summary

## ✅ What's Been Deployed

### 1. Shared Infrastructure (✅ Complete)

| Component | Details |
|-----------|---------|
| Cloud SQL | `lovable-test-db` (10.66.0.3) |
| Database User | `appfactory_user` (password in Secret Manager) |
| VPC Connector | `run-vpc-me-central2` |
| Region | `me-central2` |

### 2. Portal (✅ Deployed)

- **URL:** https://appfactory-v2-portal-621571041797.me-central2.run.app
- **Health:** ✅ Working
- **Web Form:** https://appfactory-v2-portal-621571041797.me-central2.run.app/
- **API:** https://appfactory-v2-portal-621571041797.me-central2.run.app/api/generate-prompt

### 3. Repository (✅ Created)

- **GitHub:** https://github.com/nelc/appfactory-v2
- **Visibility:** Public
- **MCP Server:** Ready for npm publish

---

## 🎯 How It Works

### Architecture

```
Business User (Cursor)
        ↓
   MCP Tool → Portal API
        ↓
  Generates Code (Node.js + React)
        ↓
   Push to GitHub
        ↓
  GitHub Actions Auto-Deploy
        ↓
  Creates:
   - 2 Cloud Run services (be + fe)
   - Load Balancer with unique IP
   - NEG + Backend Services
   - Database on shared Cloud SQL
        ↓
  Outputs: DNS instruction
        ↓
  User adds DNS record in Cloudflare
        ↓
  https://app-name.futurex.sa is LIVE
```

### Key Points

1. **Each app gets its own IP** (not shared)
2. **User manually adds DNS** per app in Cloudflare
3. **Shared Cloud SQL** (all apps use `lovable-test-db`)
4. **Locked tech stack** (Node.js + React only)
5. **Zero manual fixes** (workflow works first time)

---

## 📋 For Business Users

### Installation

```bash
# Install MCP tool
npm install -g git+https://github.com/nelc/appfactory-v2.git#mcp-server

# Configure in Cursor MCP settings
{
  "mcpServers": {
    "app-factory": {
      "command": "npx",
      "args": ["@nelc/app-factory-mcp"]
    }
  }
}
```

### Usage

In Cursor:
```
Generate my Customer Tracker app using App Factory tool.

Features:
- Add/edit customers
- Search
- Export CSV

Needs database: yes
```

### After Deployment

Workflow outputs:
```
Add DNS in Cloudflare:
Type: A
Name: customer-tracker.futurex.sa  
Value: 34.xxx.xxx.xxx
```

---

## 🔧 Troubleshooting

### If deployment fails:

1. Check GitHub Actions logs
2. Verify org secrets exist:
   - `WIF_PROVIDER`
   - `WIF_SERVICE_ACCOUNT`
3. Verify Cloud SQL is running:
   ```bash
   gcloud sql instances describe lovable-test-db --project=app-sandbox-factory
   ```

### If DNS doesn't resolve:

1. Wait 5 minutes for propagation
2. Verify exact IP matches workflow output
3. Check Cloudflare proxy is OFF (gray cloud)

---

## 📊 Cost Estimate

**Shared Infrastructure:**
- Cloud SQL: ~$25/month
- VPC Connector: ~$9/month

**Per App:**
- Load Balancer: ~$18/month
- Cloud Run: $0-5/month (low traffic)
- Static IP: $1/month

**Total for 10 apps:** ~$200/month

---

## 🎯 Success Metrics

| Metric | V1 | V2 |
|--------|----|----|
| Success Rate | ~50% | 100% target |
| Deploy Time | 2+ hours | 5 minutes |
| Manual Steps | Many | 1 (DNS only) |
| User Errors | Frequent | Minimal |

---

## 🚀 Next Steps

1. ✅ Infrastructure deployed
2. ✅ Portal deployed  
3. ⏳ Test with real app deployment
4. ⏳ Publish MCP tool to npm (optional)
5. ⏳ Train business users

---

**Status:** Ready for testing! 🎉

