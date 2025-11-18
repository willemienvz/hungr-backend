#!/bin/bash
#
# Security Fix Deployment Script
# Deploys Firestore rules with media library isolation fix
#
# Usage: ./deploy-security-fix.sh [--skip-emulator] [--production]
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_EMULATOR=false
DEPLOY_PROD=false

for arg in "$@"; do
  case $arg in
    --skip-emulator)
      SKIP_EMULATOR=true
      ;;
    --production)
      DEPLOY_PROD=true
      ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Security Fix Deployment - Media Library Isolation    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

# Step 1: Verify we're in the right directory
if [ ! -f "firestore.rules" ]; then
  echo -e "${RED}❌ Error: firestore.rules not found${NC}"
  echo "Please run this script from the backend directory"
  exit 1
fi

echo -e "${GREEN}✓${NC} Found firestore.rules"

# Step 2: Verify backup exists
BACKUP_COUNT=$(ls -1 firestore.rules.backup-* 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ Error: No backup files found${NC}"
  echo "Creating backup now..."
  cp firestore.rules "firestore.rules.backup-$(date +%Y%m%d-%H%M%S)"
fi

echo -e "${GREEN}✓${NC} Backup files exist ($BACKUP_COUNT backups)"

# Step 3: Show the security fix
echo -e "\n${BLUE}Security Fix Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${RED}BEFORE (Vulnerable):${NC}"
echo "  allow read: if isAuthenticated();"
echo ""
echo -e "${GREEN}AFTER (Secure):${NC}"
echo "  allow read: if isAuthenticated() &&"
echo "    (resource.data.userId == request.auth.uid ||"
echo "     resource.data.ownerId == request.auth.uid ||"
echo "     resource.data.uploadedBy == request.auth.uid);"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 4: Test in emulator (unless skipped)
if [ "$SKIP_EMULATOR" = false ]; then
  echo -e "\n${YELLOW}⚠️  RECOMMENDATION: Test in Firebase emulator first${NC}"
  echo ""
  echo "To test in emulator:"
  echo "  1. Run: firebase emulators:start"
  echo "  2. Test media library with multiple users"
  echo "  3. Verify user isolation works"
  echo "  4. Press Ctrl+C to stop emulator"
  echo ""
  read -p "Have you tested in the emulator? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled. Please test in emulator first.${NC}"
    echo ""
    echo "To skip this check next time: ./deploy-security-fix.sh --skip-emulator"
    exit 0
  fi
fi

# Step 5: Show current Firebase project
echo -e "\n${BLUE}Current Firebase project:${NC}"
firebase use
echo ""

# Step 6: Confirm deployment
if [ "$DEPLOY_PROD" = false ]; then
  echo -e "${YELLOW}⚠️  You are about to deploy Firestore security rules${NC}"
  echo ""
  read -p "Deploy to PRODUCTION? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
  fi
fi

# Step 7: Deploy
echo -e "\n${BLUE}Deploying Firestore rules...${NC}"
if firebase deploy --only firestore:rules; then
  echo -e "\n${GREEN}✅ Deployment successful!${NC}\n"
  
  # Post-deployment instructions
  echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║           POST-DEPLOYMENT VERIFICATION                 ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}IMMEDIATE ACTIONS (next 5 minutes):${NC}"
  echo "  1. Open your application in a browser"
  echo "  2. Sign in and navigate to Media Library"
  echo "  3. Verify your media loads correctly"
  echo "  4. Upload a test media file"
  echo "  5. Check browser console for errors"
  echo ""
  
  echo -e "${YELLOW}MULTI-USER TEST (next 15 minutes):${NC}"
  echo "  1. Sign in as User A, upload media"
  echo "  2. Sign in as User B"
  echo "  3. Verify User B CANNOT see User A's media"
  echo ""
  
  echo -e "${YELLOW}MONITORING (next 1-2 hours):${NC}"
  echo "  1. Watch Firebase Console logs"
  echo "  2. Monitor for permission-denied errors"
  echo "  3. Check for user reports"
  echo ""
  
  echo -e "${GREEN}Deployment logged in: DEPLOY-SECURITY-FIX.md${NC}"
  echo -e "${GREEN}Full instructions in: DEPLOY-SECURITY-FIX.md${NC}\n"
  
  # Record deployment
  echo "Deployment Date: $(date)" >> deployment-log.txt
  echo "Rules Deployed: firestore.rules" >> deployment-log.txt
  echo "Status: SUCCESS" >> deployment-log.txt
  echo "---" >> deployment-log.txt
  
else
  echo -e "\n${RED}❌ Deployment failed!${NC}\n"
  echo "Check the error messages above for details."
  echo ""
  echo "If needed, rollback with:"
  echo "  cp firestore.rules.backup-YYYYMMDD-HHMMSS firestore.rules"
  echo "  firebase deploy --only firestore:rules --force"
  exit 1
fi













