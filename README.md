# NELC App Factory V2 🏭

**Simplified, bulletproof app deployment to GCP Cloud Run.**

## What's New in V2

✅ **Zero manual intervention** - deploys work first time  
✅ **Shared infrastructure** - one Cloud SQL, one LB  
✅ **Locked tech stack** - Node.js + React (no choices = no errors)  
✅ **Simple workflows** - 30 lines instead of 200  
✅ **Clear DNS instructions** - no confusion  

## Architecture

```
Business User (Cursor)
        ↓
    MCP Tool
        ↓
   Portal API → Generates Code
        ↓
   GitHub Push → Auto Deploy
        ↓
  Cloud Run (with shared DB, LB, SSL)
        ↓
  https://app-name.futurex.sa
```

## Quick Start

### For Admins (One-Time Setup)

```bash
# 1. Clone repo
git clone https://github.com/nelc/appfactory-v2.git
cd appfactory-v2

# 2. Create shared infrastructure
cd setup
chmod +x *.sh
./create-shared-infrastructure.sh

# 3. Deploy portal
cd ../portal
gcloud run deploy appfactory-v2-portal \
  --source . \
  --region me-central2 \
  --allow-unauthenticated
```

**See [SETUP.md](docs/SETUP.md) for detailed instructions.**

---

### For Business Users

1. **Install MCP tool in Cursor**
   ```bash
   npm install -g @nelc/app-factory-mcp
   ```

2. **Use in Cursor**
   ```
   "Generate my Customer Tracker app using App Factory tool"
   ```

3. **Push to GitHub**
   - Code auto-deploys
   - Add DNS record (instructions in workflow output)
   - App live at `https://app-name.futurex.sa`

**See [USER_GUIDE.md](docs/USER_GUIDE.md) for step-by-step guide.**

---

## What Changed from V1

| Aspect | V1 (Complex) | V2 (Simple) |
|--------|--------------|-------------|
| Cloud SQL | Multiple instances, Shared VPC issues | ONE shared instance, private IP |
| Load Balancer | Created per-app (error-prone) | ONE shared, apps just added |
| Tech Stack | User choice (Python/Go/etc) | Locked (Node + React) |
| Workflow | 200 lines bash | 30 lines YAML |
| Success Rate | ~50% | ~100% |
| Deploy Time | 2+ hours (with fixes) | 5 minutes |

## Repository Structure

```
appfactory-v2/
├── portal/          # Self-service portal with fixed prompt
├── mcp-server/      # MCP tool for Cursor
├── setup/           # One-time infrastructure scripts
├── scripts/         # Used by app deployments
└── docs/            # Documentation
```

## Documentation

- [SETUP.md](docs/SETUP.md) - Admin setup guide
- [USER_GUIDE.md](docs/USER_GUIDE.md) - Business user guide
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Technical details

## Support

Issues with:
- **Infrastructure setup**: Check [SETUP.md](docs/SETUP.md)
- **App deployment**: Check [USER_GUIDE.md](docs/USER_GUIDE.md)
- **DNS configuration**: See workflow output for exact instructions

## License

Internal use only - NELC

