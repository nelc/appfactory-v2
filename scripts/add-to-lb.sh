#!/bin/bash
set -euo pipefail

# Create Load Balancer for single app (with unique IP)
# Usage: ./add-to-lb.sh <app-name>

APP_NAME="${1:?App name required}"
PROJECT_ID="app-sandbox-factory"
REGION="me-central2"
CERT_NAME="futurex-wildcard"

echo "🔗 Creating Load Balancer for $APP_NAME..."

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

# 3. Create URL map with path routing
echo "   Creating URL map..."
URL_MAP="${APP_NAME}-um"

cat > /tmp/${APP_NAME}-urlmap.yaml << EOF
name: ${URL_MAP}
defaultService: https://www.googleapis.com/compute/v1/projects/${PROJECT_ID}/regions/${REGION}/backendServices/${APP_NAME}-fe-bs
hostRules:
- hosts:
  - ${APP_NAME}.futurex.sa
  pathMatcher: ${APP_NAME}-pm
pathMatchers:
- name: ${APP_NAME}-pm
  defaultService: https://www.googleapis.com/compute/v1/projects/${PROJECT_ID}/regions/${REGION}/backendServices/${APP_NAME}-fe-bs
  pathRules:
  - paths:
    - /api
    - /api/*
    service: https://www.googleapis.com/compute/v1/projects/${PROJECT_ID}/regions/${REGION}/backendServices/${APP_NAME}-be-bs
EOF

gcloud compute url-maps import $URL_MAP \
  --region=$REGION \
  --project=$PROJECT_ID \
  --source=/tmp/${APP_NAME}-urlmap.yaml \
  --quiet 2>/dev/null || gcloud compute url-maps create $URL_MAP \
  --default-service=${APP_NAME}-fe-bs \
  --region=$REGION \
  --project=$PROJECT_ID

# 4. Create static IP
echo "   Creating static IP..."
STATIC_IP_NAME="${APP_NAME}-ip"

if ! gcloud compute addresses describe $STATIC_IP_NAME \
    --region=$REGION \
    --project=$PROJECT_ID &>/dev/null; then
  gcloud compute addresses create $STATIC_IP_NAME \
    --region=$REGION \
    --project=$PROJECT_ID
fi

LB_IP=$(gcloud compute addresses describe $STATIC_IP_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(address)")

# 5. Create HTTPS proxy
echo "   Creating HTTPS proxy..."
PROXY_NAME="${APP_NAME}-proxy"

if ! gcloud compute target-https-proxies describe $PROXY_NAME \
    --region=$REGION \
    --project=$PROJECT_ID &>/dev/null; then
  gcloud compute target-https-proxies create $PROXY_NAME \
    --region=$REGION \
    --url-map=$URL_MAP \
    --certificate-manager-certificates=$CERT_NAME \
    --project=$PROJECT_ID
fi

# 6. Create forwarding rule
echo "   Creating forwarding rule..."
FWD_RULE="${APP_NAME}-fwd"

if ! gcloud compute forwarding-rules describe $FWD_RULE \
    --region=$REGION \
    --project=$PROJECT_ID &>/dev/null; then
  gcloud compute forwarding-rules create $FWD_RULE \
    --region=$REGION \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --address=$STATIC_IP_NAME \
    --target-https-proxy=$PROXY_NAME \
    --target-https-proxy-region=$REGION \
    --ports=443 \
    --project=$PROJECT_ID
fi

echo ""
echo "✅ Load Balancer created for $APP_NAME!"
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
