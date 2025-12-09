#!/bin/bash

# Brevo Configuration Setup Script (Firebase CLI Method)
# 
# This script sets up Brevo template IDs and contact list IDs directly via Firebase CLI.
# Edit the values below with your actual IDs from Brevo dashboard, then run:
#   chmod +x setup-brevo-config-firebase-cli.sh
#   ./setup-brevo-config-firebase-cli.sh
#
# This method uses Firebase CLI to write directly to Firestore.

set -e  # Exit on error

echo "🚀 Brevo Configuration Setup (Firebase CLI Method)"
echo "=================================================="
echo ""

# ============================================================================
# EDIT THESE VALUES WITH YOUR ACTUAL BREVO IDs
# ============================================================================

# Template IDs (get these from Brevo Dashboard → Transactional → Templates)
BREVO_TEMPLATE_VERIFICATION=0          # Email verification template ID
BREVO_TEMPLATE_PASSWORD_RESET=0        # Password reset template ID
BREVO_TEMPLATE_WELCOME=0                # Welcome email template ID
BREVO_TEMPLATE_SUBSCRIPTION_CHANGE=0    # Subscription change template ID
BREVO_TEMPLATE_GENERIC=0                # Generic/fallback template ID (REQUIRED)

# Contact List IDs (get these from Brevo Dashboard → Contacts → Lists)
BREVO_LIST_MARKETING=35                 # Marketing contact list ID
BREVO_LIST_TIPS=36                       # Tips & Tutorials contact list ID
BREVO_LIST_INSIGHTS=37                    # User Insights contact list ID

# Sender Configuration
BREVO_SENDER_EMAIL="noreply@hungr.com"  # Sender email (must be verified in Brevo)
BREVO_SENDER_NAME="Hungr"                # Sender display name

# ============================================================================
# END OF CONFIGURATION - DO NOT EDIT BELOW THIS LINE
# ============================================================================

echo "📋 Configuration Values:"
echo "  Verification Template:     $BREVO_TEMPLATE_VERIFICATION"
echo "  Password Reset Template:   $BREVO_TEMPLATE_PASSWORD_RESET"
echo "  Welcome Template:          $BREVO_TEMPLATE_WELCOME"
echo "  Subscription Change:       $BREVO_TEMPLATE_SUBSCRIPTION_CHANGE"
echo "  Generic Template:          $BREVO_TEMPLATE_GENERIC"
echo "  Marketing List:            $BREVO_LIST_MARKETING"
echo "  Tips List:                 $BREVO_LIST_TIPS"
echo "  Insights List:             $BREVO_LIST_INSIGHTS"
echo "  Sender Email:              $BREVO_SENDER_EMAIL"
echo "  Sender Name:               $BREVO_SENDER_NAME"
echo ""

# Validate that generic template is set (minimum requirement)
if [ "$BREVO_TEMPLATE_GENERIC" -eq 0 ]; then
    echo "❌ ERROR: BREVO_TEMPLATE_GENERIC must be set (at minimum)"
    echo ""
    echo "Please edit this script and set BREVO_TEMPLATE_GENERIC to your generic template ID."
    echo "You can find template IDs in Brevo Dashboard → Transactional → Templates"
    exit 1
fi

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI not found"
    echo "Please install Firebase CLI: npm install -g firebase-tools"
    exit 1
fi

# Create temporary JSON file with configuration
TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE" <<EOF
{
  "templates": {
    "verification": $BREVO_TEMPLATE_VERIFICATION,
    "passwordReset": $BREVO_TEMPLATE_PASSWORD_RESET,
    "welcome": $BREVO_TEMPLATE_WELCOME,
    "subscriptionChange": $BREVO_TEMPLATE_SUBSCRIPTION_CHANGE,
    "generic": $BREVO_TEMPLATE_GENERIC
  },
  "contactLists": {
    "marketing": $BREVO_LIST_MARKETING,
    "tips": $BREVO_LIST_TIPS,
    "insights": $BREVO_LIST_INSIGHTS
  },
  "sender": {
    "email": "$BREVO_SENDER_EMAIL",
    "name": "$BREVO_SENDER_NAME"
  },
  "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "📦 Writing configuration to Firestore..."
echo ""

# Use Firebase CLI to set the document
# Note: This requires firebase-tools and proper authentication
firebase firestore:set brevo_config/templates "$TEMP_FILE" --yes

# Clean up temp file
rm "$TEMP_FILE"

echo ""
echo "✅ Configuration saved to Firestore!"
echo ""
echo "📝 Next steps:"
echo "  1. Verify the configuration in Firebase Console → Firestore → brevo_config/templates"
echo "  2. Test email sending by creating a test user account"
echo "  3. Check email_logs collection for successful sends"
echo ""














