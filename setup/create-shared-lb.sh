#!/bin/bash
set -euo pipefail

# Create shared Load Balancer for all App Factory apps

PROJECT_ID="app-sandbox-factory"
REGION="me-central2"
CERT_NAME="futurex-wildcard"
LB_NAME="appfactory-v2-shared"

echo "Creating shared Load Balancer: $LB_NAME"

# 1. Create static IP
if ! gcloud compute addresses describe ${LB_NAME}-ip --region=$REGION --project=$PROJECT_ID &>/dev/null; then
  echo "Creating static IP..."
  gcloud compute addresses create ${LB_NAME}-ip \
    --region=$REGION \
    --project=$PROJECT_ID
fi

LB_IP=$(gcloud compute addresses describe ${LB_NAME}-ip \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(address)")

echo "Load Balancer IP: $LB_IP"

# 2. Create default backend service (404 page)
if ! gcloud compute backend-services describe ${LB_NAME}-default-bs \
    --region=$REGION \
    --project=$PROJECT_ID &>/dev/null; then
  echo "Creating default backend service..."
  gcloud compute backend-services create ${LB_NAME}-default-bs \
    --region=$REGION \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --protocol=HTTPS \
    --project=$PROJECT_ID
fi

# 3. Create URL map
if ! gcloud compute url-maps describe ${LB_NAME}-um \
    --region=$REGION \
    --project=$PROJECT_ID &>/dev/null; then
  echo "Creating URL map..."
  gcloud compute url-maps create ${LB_NAME}-um \
    --default-service=${LB_NAME}-default-bs \
    --region=$REGION \
    --project=$PROJECT_ID
fi

# 4. Create HTTPS proxy
if ! gcloud compute target-https-proxies describe ${LB_NAME}-proxy \
    --region=$REGION \
    --project=$PROJECT_ID &>/dev/null; then
  echo "Creating HTTPS proxy..."
  gcloud compute target-https-proxies create ${LB_NAME}-proxy \
    --region=$REGION \
    --url-map=${LB_NAME}-um \
    --certificate-manager-certificates=$CERT_NAME \
    --project=$PROJECT_ID
fi

# 5. Create forwarding rule
if ! gcloud compute forwarding-rules describe ${LB_NAME}-fwd \
    --region=$REGION \
    --project=$PROJECT_ID &>/dev/null; then
  echo "Creating forwarding rule..."
  gcloud compute forwarding-rules create ${LB_NAME}-fwd \
    --region=$REGION \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --address=${LB_NAME}-ip \
    --target-https-proxy=${LB_NAME}-proxy \
    --target-https-proxy-region=$REGION \
    --ports=443 \
    --project=$PROJECT_ID
fi

echo ""
echo "✅ Shared Load Balancer created!"
echo "   IP: $LB_IP"
echo "   URL Map: ${LB_NAME}-um"
echo ""
echo "📋 Configure DNS:"
echo "   *.futurex.sa → $LB_IP"
echo ""

