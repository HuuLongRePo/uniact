#!/bin/bash
# Production Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e  # Exit on error

ENVIRONMENT=${1:-production}
DEPLOY_USER="deploy"
DEPLOY_HOST="192.168.1.100"
DEPLOY_PATH="/opt/uniact"
DB_PATH="/var/lib/uniact"
LOG_PATH="/var/log/uniact"
BACKUP_PATH="/var/backups/uniact"

echo "🚀 UniAct Deployment Script"
echo "Environment: $ENVIRONMENT"
echo "Target: $DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo "ℹ️  $1"
}

# Pre-deployment checks
print_info "Running pre-deployment checks..."

# Check if all tests pass
print_info "Running tests..."
npm test
if [ $? -ne 0 ]; then
    print_error "Tests failed! Aborting deployment."
    exit 1
fi
print_success "All tests passed"

# Check if build succeeds
print_info "Creating production build..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Build failed! Aborting deployment."
    exit 1
fi
print_success "Build successful"

# Create deployment package
print_info "Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="uniact-${ENVIRONMENT}-${TIMESTAMP}.tar.gz"

tar -czf "$PACKAGE_NAME" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.next/cache \
    --exclude=test \
    --exclude=*.log \
    --exclude=.env.local \
    .

print_success "Package created: $PACKAGE_NAME"

# Upload to server
print_info "Uploading to server..."
scp "$PACKAGE_NAME" "$DEPLOY_USER@$DEPLOY_HOST:/tmp/"
print_success "Upload complete"

# Remote deployment
print_info "Executing remote deployment..."
ssh "$DEPLOY_USER@$DEPLOY_HOST" << EOF
set -e

echo "📦 Extracting package..."
cd /tmp
tar -xzf "$PACKAGE_NAME"

# Backup current version
if [ -d "$DEPLOY_PATH" ]; then
    echo "💾 Backing up current version..."
    sudo cp -r "$DEPLOY_PATH" "${BACKUP_PATH}/backup-${TIMESTAMP}"
fi

# Create directories if they don't exist
echo "📁 Creating directories..."
sudo mkdir -p "$DEPLOY_PATH"
sudo mkdir -p "$DB_PATH"
sudo mkdir -p "$LOG_PATH"
sudo mkdir -p "$BACKUP_PATH"
sudo mkdir -p "${DB_PATH}/uploads"

# Move new version
echo "🔄 Deploying new version..."
sudo rm -rf "$DEPLOY_PATH/*"
sudo mv -f /tmp/* "$DEPLOY_PATH/" 2>/dev/null || true

# Set permissions
echo "🔒 Setting permissions..."
sudo chown -R $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH"
sudo chown -R $DEPLOY_USER:$DEPLOY_USER "$DB_PATH"
sudo chown -R $DEPLOY_USER:$DEPLOY_USER "$LOG_PATH"
sudo chmod -R 755 "$DEPLOY_PATH"
sudo chmod -R 750 "$DB_PATH"

# Install dependencies
echo "📦 Installing dependencies..."
cd "$DEPLOY_PATH"
npm ci --production

# Run migrations
echo "🗄️  Running database migrations..."
npm run migrate

# Restart PM2
echo "🔄 Restarting application..."
pm2 reload ecosystem.config.js --env production
pm2 save

# Health check
echo "🏥 Waiting for health check..."
sleep 5
HEALTH_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "\$HEALTH_STATUS" = "200" ]; then
    echo "✅ Application is healthy"
else
    echo "❌ Health check failed (Status: \$HEALTH_STATUS)"
    echo "🔙 Rolling back..."
    sudo rm -rf "$DEPLOY_PATH"
    sudo cp -r "${BACKUP_PATH}/backup-${TIMESTAMP}" "$DEPLOY_PATH"
    pm2 reload ecosystem.config.js --env production
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up..."
rm -f "/tmp/$PACKAGE_NAME"

echo "✅ Deployment complete!"
pm2 status
EOF

if [ $? -eq 0 ]; then
    print_success "Deployment successful!"
    print_info "Application URL: https://uniact.local"
    print_info "Admin panel: https://uniact.local/admin"
    
    # Cleanup local package
    rm -f "$PACKAGE_NAME"
    
    # Show logs
    print_info "Showing recent logs..."
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "pm2 logs uniact --lines 20 --nostream"
else
    print_error "Deployment failed!"
    exit 1
fi

echo ""
print_success "🎉 Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Monitor logs: ssh $DEPLOY_USER@$DEPLOY_HOST 'pm2 logs uniact'"
echo "  2. Check status: ssh $DEPLOY_USER@$DEPLOY_HOST 'pm2 status'"
echo "  3. Test application: https://uniact.local"
echo ""
