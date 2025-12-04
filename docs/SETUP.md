# App Factory V2 - Admin Setup Guide

This guide is for **administrators** setting up the shared infrastructure.

---

## Prerequisites

- GCP Project: `app-sandbox-factory`
- gcloud CLI installed and authenticated
- Permissions: Cloud SQL Admin, Compute Admin, Cloud Run Admin
- Wildcard SSL cert: `futurex-wildcard` (already exists)

---

## One-Time Setup (30 minutes)

### Step 1: Clone Repository

```bash
git clone https://github.com/nelc/appfactory-v2.git
cd appfactory-v2
```

### Step 2: Create Shared Infrastructure

```bash
cd setup
chmod +x *.sh
./create-shared-infrastructure.sh
```

This creates:
- ✅ Cloud SQL instance (`appfactory-shared-db`)
- ✅ Database user (`appfactory_user`) with password in Secret Manager
- ✅ VPC Connector (`run-vpc-me-central2`)
- ✅ Shared Load Balancer with static IP

**Output will show the Load Balancer IP** - note it down.

### Step 3: Configure Wildcard DNS

In Cloudflare, create/update:

```
Type: A
Name: *.futurex.sa
Value: [LB_IP from step 2]
TTL: Auto
Proxy: DNS Only (gray cloud)
```

###  Step 4: Configure GitHub Organization Secrets

Set these secrets at `https://github.com/organizations/nelc/settings/secrets/actions`:

| Secret Name | Value |
|-------------|-------|
| `WIF_PROVIDER` | `projects/621571041797/locations/global/workloadIdentityPools/nelc-github-pool/providers/nelc-github-pool-provider` |
| `WIF_SERVICE_ACCOUNT` | `app-factory-sa@app-sandbox-factory.iam.gserviceaccount.com` |

(These should already exist from V1)

### Step 5: Deploy Portal

```bash
cd ../portal
gcloud run deploy appfactory-v2-portal \
  --source . \
  --region me-central2 \
  --project app-sandbox-factory \
  --allow-unauthenticated \
  --quiet
```

**Note the portal URL** - it will be used by the MCP server.

### Step 6: Publish MCP Server

```bash
cd ../mcp-server
chmod +x server.js

# Option A: Publish to npm (for easy install)
npm publish --access public

# Option B: Users install directly from GitHub
# (they'll run: npm install -g git+https://github.com/nelc/appfactory-v2.git#mcp-server)
```

---

## Verification

Test the setup:

```bash
# 1. Portal health
curl https://appfactory-v2-portal-wyn3ql7bvq-wx.a.run.app/api/health

# 2. Cloud SQL connectivity
gcloud sql instances describe appfactory-shared-db --project=app-sandbox-factory

# 3. Load Balancer
gcloud compute forwarding-rules describe appfactory-v2-shared-fwd \
  --region=me-central2 \
  --project=app-sandbox-factory
```

---

## Maintenance

### Adding More Database Capacity

```bash
gcloud sql instances patch appfactory-shared-db \
  --tier=db-custom-2-7680 \
  --project=app-sandbox-factory
```

### Checking App Deployments

```bash
# List all apps
gcloud run services list --region=me-central2 --project=app-sandbox-factory

# Check specific app
gcloud run services describe my-app-be --region=me-central2
```

### Troubleshooting Failed Deployments

1. Check GitHub Actions logs
2. Verify org secrets are set
3. Check Cloud SQL instance is running
4. Verify VPC connector exists

---

## Cost Estimate

**Monthly costs** (shared across all apps):

| Resource | Cost |
|----------|------|
| Cloud SQL (db-g1-small) | ~$25/month |
| VPC Connector | ~$9/month |
| Load Balancer | ~$18/month |
| **Total** | **~$52/month** |

Individual apps add:
- Cloud Run: Pay per use (~$0-5/app/month for low traffic)
- Storage: Minimal (~$0.02/GB/month)

---

## Next Steps

✅ Setup complete! Business users can now:
1. Install MCP tool in Cursor
2. Generate and deploy apps
3. Add DNS records per app

See [USER_GUIDE.md](USER_GUIDE.md) for user instructions.

