#!/bin/bash

# Brevo Configuration Setup Script
# 
# This script sets up Brevo template IDs and contact list IDs.
# Edit the values below with your actual IDs from Brevo dashboard, then run:
#   chmod +x setup-brevo-config.sh
#   ./setup-brevo-config.sh
#
# Or run directly:
#   bash setup-brevo-config.sh

set -e  # Exit on error

echo "🚀 Brevo Configuration Setup"
echo "============================"
echo ""

# ============================================================================
# EDIT THESE VALUES WITH YOUR ACTUAL BREVO IDs
# ============================================================================

# Template IDs (get these from Brevo Dashboard → Transactional → Templates)
BREVO_TEMPLATE_VERIFICATION=0          # Email verification template ID
BREVO_TEMPLATE_PASSWORD_RESET=0         # Password reset template ID
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

# Check if we're in the functions directory
if [ ! -f "package.json" ]; then
    echo "⚠️  Warning: Not in functions directory. Changing to functions/..."
    cd functions 2>/dev/null || {
        echo "❌ Error: Could not find functions directory"
        exit 1
    }
fi

# Export variables for the TypeScript script
export BREVO_TEMPLATE_VERIFICATION
export BREVO_TEMPLATE_PASSWORD_RESET
export BREVO_TEMPLATE_WELCOME
export BREVO_TEMPLATE_SUBSCRIPTION_CHANGE
export BREVO_TEMPLATE_GENERIC
export BREVO_LIST_MARKETING
export BREVO_LIST_TIPS
export BREVO_LIST_INSIGHTS
export BREVO_SENDER_EMAIL
export BREVO_SENDER_NAME

echo "📦 Setting up configuration..."
echo ""

# Check if TypeScript script exists
if [ ! -f "src/scripts/setupBrevoConfig.ts" ]; then
    echo "❌ Error: setupBrevoConfig.ts not found"
    echo "Expected location: src/scripts/setupBrevoConfig.ts"
    exit 1
fi

# Try to run the TypeScript script
if command -v npx &> /dev/null; then
    echo "Running setup script via npx ts-node..."
    npx ts-node src/scripts/setupBrevoConfig.ts
elif [ -f "lib/scripts/setupBrevoConfig.js" ]; then
    echo "Running compiled setup script..."
    node lib/scripts/setupBrevoConfig.js
else
    echo "⚠️  TypeScript script not compiled. Building first..."
    npm run build
    if [ -f "lib/scripts/setupBrevoConfig.js" ]; then
        echo "Running compiled setup script..."
        node lib/scripts/setupBrevoConfig.js
    else
        echo "❌ Error: Could not find or compile setup script"
        echo "Please run: npm install && npm run build"
        exit 1
    fi
fi

echo ""
echo "✅ Configuration setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Verify the configuration in Firebase Console → Firestore → brevo_config/templates"
echo "  2. Test email sending by creating a test user account"
echo "  3. Check email_logs collection for successful sends"
echo ""












