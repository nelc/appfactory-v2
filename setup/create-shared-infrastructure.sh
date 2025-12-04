#!/bin/bash
set -euo pipefail

# NELC App Factory V2 - Shared Infrastructure Setup
# Run this ONCE to create shared Cloud SQL and VPC Connector

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
echo "NOTE: Each app will get its own Load Balancer IP"
echo ""

# 1. Check if using existing Cloud SQL or creating new
echo "📊 1. Checking Cloud SQL instance..."
if gcloud sql instances describe lovable-test-db --project=$PROJECT_ID &>/dev/null; then
  echo "   ✅ Using existing Cloud SQL: lovable-test-db"
  SQL_INSTANCE="lovable-test-db"
elif gcloud sql instances describe appfactory-shared-db --project=$PROJECT_ID &>/dev/null; then
  echo "   ✅ Using existing Cloud SQL: appfactory-shared-db"
  SQL_INSTANCE="appfactory-shared-db"
else
  echo "   Creating new Cloud SQL instance..."
  SQL_INSTANCE="appfactory-shared-db"
  gcloud sql instances create $SQL_INSTANCE \
    --database-version=POSTGRES_15 \
    --tier=db-g1-small \
    --region=$REGION \
    --network=$VPC_NETWORK \
    --no-assign-ip \
    --project=$PROJECT_ID
  
  echo "   ✅ Cloud SQL instance created: $SQL_INSTANCE"
fi

# 2. Create shared database user
echo ""
echo "👤 2. Creating shared database user..."
if gcloud sql users list --instance=$SQL_INSTANCE --project=$PROJECT_ID | grep -q "appfactory_user"; then
  echo "   ✅ Database user already exists"
else
  PASSWORD=$(openssl rand -base64 32)
  gcloud sql users create appfactory_user \
    --instance=$SQL_INSTANCE \
    --password="$PASSWORD" \
    --project=$PROJECT_ID
  
  echo "   ✅ Database user created"
  echo "   📝 Storing password in Secret Manager..."
  echo -n "$PASSWORD" | gcloud secrets create appfactory-db-password \
    --data-file=- \
    --project=$PROJECT_ID 2>/dev/null || \
    echo -n "$PASSWORD" | gcloud secrets versions add appfactory-db-password \
    --data-file=-
  
  # Grant service account access to secret
  gcloud secrets add-iam-policy-binding appfactory-db-password \
    --member="serviceAccount:app-factory-sa@app-sandbox-factory.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID
fi

# 3. Get Cloud SQL private IP
echo ""
echo "🌐 3. Getting Cloud SQL private IP..."
SQL_IP=$(gcloud sql instances describe $SQL_INSTANCE \
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

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ SETUP COMPLETE!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Configuration Summary:"
echo "   Cloud SQL Instance: $SQL_INSTANCE"
echo "   Cloud SQL IP: $SQL_IP"
echo "   Database User: appfactory_user"
echo "   VPC Connector: run-vpc-me-central2"
echo "   Region: $REGION"
echo ""
echo "🎯 Next Steps:"
echo "   1. Deploy the portal to Cloud Run"
echo "   2. Each app will create its own Load Balancer + IP"
echo "   3. Users add DNS records manually per app"
echo ""
