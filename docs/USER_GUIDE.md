# App Factory V2 - Business User Guide

**Deploy production-ready apps to GCP in 5 minutes.**

---

## Prerequisites

- Cursor IDE installed
- GitHub account (member of `nelc` organization)
- Basic understanding of your app requirements

---

## Step-by-Step Guide

### Step 1: Install MCP Tool (One-Time)

In your terminal:

```bash
npm install -g @nelc/app-factory-mcp
```

### Step 2: Configure Cursor

Add to your Cursor MCP settings (Cmd/Ctrl + Shift + P → "MCP: Edit Config"):

```json
{
  "mcpServers": {
    "app-factory": {
      "command": "app-factory-mcp"
    }
  }
}
```

Restart Cursor.

### Step 3: Generate Your App

In Cursor, start a new chat and say:

```
Generate my [APP_NAME] app using the App Factory tool.

Features:
- [Feature 1]
- [Feature 2]
- [Feature 3]

Needs database: yes/no
Needs file storage: yes/no
```

**Example:**
```
Generate my Customer Tracker app using the App Factory tool.

Features:
- Add/edit/delete customers
- Search customers
- Export to CSV
- Customer notes

Needs database: yes
Needs file storage: no
```

### Step 4: Review Generated Code

The MCP tool will generate:
- ✅ Backend (Node.js + Express)
- ✅ Frontend (React + Vite)
- ✅ GitHub Actions workflow
- ✅ All configuration files

**Verify the file tree is shown and all files are created.**

### Step 5: Create GitHub Repository

When prompted, allow Cursor to run:

```bash
gh repo create nelc/[repo-name] --private --source=. --push
```

### Step 6: Monitor Deployment

1. Go to: `https://github.com/nelc/[repo-name]/actions`
2. Watch the workflow run (~3-5 minutes)
3. **Workflow will output DNS instructions**

### Step 7: Configure DNS

From the workflow output, you'll see:

```
📋 DNS CONFIGURATION REQUIRED:

Type: A
Name: customer-tracker.futurex.sa
Value: 34.xxx.xxx.xxx
```

**Add this record in Cloudflare** (ask admin if you don't have access).

### Step 8: Access Your App

Wait 1-5 minutes for DNS to propagate, then visit:

```
https://[app-name].futurex.sa
```

**That's it! Your app is live. 🎉**

---

## Common Issues

### "Workflow failed with authentication error"

**Cause:** Organization secrets not configured.  
**Fix:** Ask admin to verify GitHub organization secrets.

### "DNS record not resolving"

**Cause:** DNS propagation delay or wrong value.  
**Fix:** 
1. Wait 5 minutes
2. Verify DNS record in Cloudflare matches workflow output
3. Use `dig [app-name].futurex.sa` to check

### "Health check failing"

**Cause:** Database connection issue (rare).  
**Fix:** Check workflow logs, may need admin help.

### "Build failed - npm errors"

**Cause:** Usually fixed automatically by buildpacks.  
**Fix:** Re-run workflow (GitHub Actions → Re-run failed jobs).

---

## Tips for Success

### ✅ DO:
- Be specific about features
- Use descriptive app names
- Check workflow logs if deployment fails
- Test your app after DNS propagates

### ❌ DON'T:
- Use spaces in app names (use hyphens: `customer-tracker`)
- Deploy without verifying all files are generated
- Skip DNS configuration step
- Modify the workflow file (it's tested and works)

---

## Example Apps

### Simple Todo List
```
Features:
- Add/delete todos
- Mark as complete
- Filter by status

Needs database: yes
Needs storage: no
```

### Invoice Manager  
```
Features:
- Create invoices
- Upload company logo
- Export PDF
- Email invoices

Needs database: yes
Needs storage: yes
```

### Inventory Tracker
```
Features:
- Add/remove items
- Track quantities
- Low stock alerts
- Barcode scanning

Needs database: yes
Needs storage: no
```

---

## Development

To work on your app locally:

```bash
# Backend
cd backend
npm install
npm start

# Frontend (another terminal)
cd frontend
npm install
npm run dev
```

Frontend will be at `http://localhost:5173`  
Backend API at `http://localhost:8080`

**Note:** Database won't work locally (it's in GCP). You can mock data for local testing.

---

## Getting Help

- **Deployment issues**: Check workflow logs in GitHub Actions
- **DNS issues**: Contact admin
- **App bugs**: Debug locally, push fixes to main branch (auto-redeploys)

---

## What's Next?

After your app is live, you can:
- Add more features (edit code, push to main)
- Monitor usage in GCP Console
- Share the URL with your team
- Request custom domain (beyond *.futurex.sa)

Happy building! 🚀

