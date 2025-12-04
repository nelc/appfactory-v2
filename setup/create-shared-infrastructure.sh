#!/bin/bash
set -euo pipefail

# NELC App Factory V2 - Shared Infrastructure Setup
# Run this ONCE to create all shared resources

PROJECT_ID="app-sandbox-factory"
REGION="me-central2"
VPC_NETWORK="appfactory-vpc"

echo "🚀 Creating App Factory V2 Shared Infrastructure"
echo "=================================================="
echo ""
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "VPC: $VPC_NETWORK"
echo ""

# 1. Create shared Cloud SQL instance (if doesn't exist)
echo "📊 1. Checking Cloud SQL instance..."
if gcloud sql instances describe appfactory-shared-db --project=$PROJECT_ID &>/dev/null; then
  echo "   ✅ Cloud SQL instance already exists"
else
  echo "   Creating Cloud SQL instance (private IP)..."
  gcloud sql instances create appfactory-shared-db \
    --database-version=POSTGRES_15 \
    --tier=db-g1-small \
    --region=$REGION \
    --network=$VPC_NETWORK \
    --no-assign-ip \
    --project=$PROJECT_ID
  
  echo "   ✅ Cloud SQL instance created"
fi

# 2. Create shared database user
echo ""
echo "👤 2. Creating shared database user..."
if gcloud sql users list --instance=appfactory-shared-db --project=$PROJECT_ID | grep -q "appfactory_user"; then
  echo "   ✅ Database user already exists"
else
  PASSWORD=$(openssl rand -base64 32)
  gcloud sql users create appfactory_user \
    --instance=appfactory-shared-db \
    --password="$PASSWORD" \
    --project=$PROJECT_ID
  
  echo "   ✅ Database user created"
  echo "   📝 Storing password in Secret Manager..."
  echo -n "$PASSWORD" | gcloud secrets create appfactory-db-password \
    --data-file=- \
    --project=$PROJECT_ID 2>/dev/null || \
    echo -n "$PASSWORD" | gcloud secrets versions add appfactory-db-password \
    --data-file=-
fi

# 3. Get Cloud SQL private IP
echo ""
echo "🌐 3. Getting Cloud SQL private IP..."
SQL_IP=$(gcloud sql instances describe appfactory-shared-db \
  --project=$PROJECT_ID \
  --format="value(ipAddresses[0].ipAddress)")
echo "   IP: $SQL_IP"

# 4. Create VPC connector (if doesn't exist)
echo ""
echo "🔌 4. Checking VPC connector..."
if gcloud compute networks vpc-access connectors describe run-vpc-me-central2 \
    --region=$REGION \
    --project=$PROJECT_ID &>/dev/null; then
  echo "   ✅ VPC connector already exists"
else
  echo "   Creating VPC connector..."
  gcloud compute networks vpc-access connectors create run-vpc-me-central2 \
    --region=$REGION \
    --network=$VPC_NETWORK \
    --range=10.8.0.0/28 \
    --project=$PROJECT_ID
  
  echo "   ✅ VPC connector created"
fi

# 5. Create shared Load Balancer
echo ""
echo "⚖️  5. Creating shared Load Balancer..."
bash $(dirname $0)/create-shared-lb.sh

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ SETUP COMPLETE!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Configuration Summary:"
echo "   Cloud SQL Instance: appfactory-shared-db"
echo "   Cloud SQL IP: $SQL_IP"
echo "   Database User: appfactory_user"
echo "   VPC Connector: run-vpc-me-central2"
echo "   Region: $REGION"
echo ""
echo "🎯 Next Steps:"
echo "   1. Deploy the portal: cd portal && gcloud run deploy ..."
echo "   2. Business users can now use the App Factory MCP tool"
echo "   3. Each app deployment will use these shared resources"
echo ""

