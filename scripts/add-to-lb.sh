#!/bin/bash
set -euo pipefail

# Add app to shared Load Balancer
# Usage: ./add-to-lb.sh <app-name>

APP_NAME="${1:?App name required}"
PROJECT_ID="app-sandbox-factory"
REGION="me-central2"
LB_NAME="appfactory-v2-shared"

echo "🔗 Adding $APP_NAME to shared Load Balancer..."

# 1. Create NEGs for backend and frontend
echo "   Creating NEGs..."
for SERVICE in "${APP_NAME}-be" "${APP_NAME}-fe"; do
  NEG_NAME="neg-${SERVICE}"
  
  if ! gcloud compute network-endpoint-groups describe $NEG_NAME \
      --region=$REGION \
      --project=$PROJECT_ID &>/dev/null; then
    gcloud compute network-endpoint-groups create $NEG_NAME \
      --region=$REGION \
      --network-endpoint-type=serverless \
      --cloud-run-service=$SERVICE \
      --project=$PROJECT_ID
  fi
done

# 2. Create backend services
echo "   Creating backend services..."
for SERVICE in "${APP_NAME}-be" "${APP_NAME}-fe"; do
  BS_NAME="${SERVICE}-bs"
  NEG_NAME="neg-${SERVICE}"
  
  if ! gcloud compute backend-services describe $BS_NAME \
      --region=$REGION \
      --project=$PROJECT_ID &>/dev/null; then
    gcloud compute backend-services create $BS_NAME \
      --region=$REGION \
      --load-balancing-scheme=EXTERNAL_MANAGED \
      --protocol=HTTPS \
      --project=$PROJECT_ID
    
    gcloud compute backend-services add-backend $BS_NAME \
      --region=$REGION \
      --network-endpoint-group=$NEG_NAME \
      --network-endpoint-group-region=$REGION \
      --project=$PROJECT_ID
  fi
done

# 3. Add to URL map
echo "   Adding to URL map..."

# Export current URL map
gcloud compute url-maps export ${LB_NAME}-um \
  --region=$REGION \
  --project=$PROJECT_ID \
  --destination=/tmp/urlmap.yaml

# Add path rules if not exist
if ! grep -q "$APP_NAME.futurex.sa" /tmp/urlmap.yaml; then
  cat >> /tmp/urlmap.yaml << EOF

hostRules:
- hosts:
  - ${APP_NAME}.futurex.sa
  pathMatcher: ${APP_NAME}-pm
pathMatchers:
- name: ${APP_NAME}-pm
  defaultService: https://www.googleapis.com/compute/v1/projects/$PROJECT_ID/regions/$REGION/backendServices/${APP_NAME}-fe-bs
  pathRules:
  - paths:
    - /api
    - /api/*
    service: https://www.googleapis.com/compute/v1/projects/$PROJECT_ID/regions/$REGION/backendServices/${APP_NAME}-be-bs
EOF

  # Import updated URL map
  gcloud compute url-maps import ${LB_NAME}-um \
    --region=$REGION \
    --project=$PROJECT_ID \
    --source=/tmp/urlmap.yaml \
    --quiet
fi

# 4. Get LB IP
LB_IP=$(gcloud compute addresses describe ${LB_NAME}-ip \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(address)")

echo ""
echo "✅ $APP_NAME added to Load Balancer!"
echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║  📋 DNS CONFIGURATION REQUIRED                    ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║                                                    ║"
echo "║  Add this record in Cloudflare:                   ║"
echo "║                                                    ║"
echo "║  Type: A                                          ║"
echo "║  Name: ${APP_NAME}.futurex.sa"
printf "║  %-50s ║\n" "Value: $LB_IP"
echo "║  TTL: Auto                                        ║"
echo "║  Proxy: DNS Only (gray cloud)                     ║"
echo "║                                                    ║"
echo "║  Once DNS propagates (1-5 minutes):               ║"
echo "║  https://${APP_NAME}.futurex.sa"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

