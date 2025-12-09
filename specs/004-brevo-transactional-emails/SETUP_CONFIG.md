# Setting Up Brevo Template and Contact List IDs

This guide explains how to configure Brevo template IDs and contact list IDs for the transactional email integration.

## Prerequisites

1. ✅ Brevo API key configured as Firebase Secret (`BREVO_API_KEY`)
2. ✅ Templates created in Brevo dashboard
3. ✅ Contact lists created in Brevo dashboard

## Step 1: Get Your IDs from Brevo Dashboard

### Template IDs

1. Log in to [Brevo Dashboard](https://app.brevo.com)
2. Go to **Transactional** → **Templates**
3. Find your templates and note their **Template ID** (numeric ID)
4. You'll need:
   - Verification email template ID
   - Password reset template ID
   - Welcome email template ID
   - Subscription change template ID
   - Generic/fallback template ID (required)

### Contact List IDs

1. Go to **Contacts** → **Lists**
2. Find your contact lists and note their **List ID** (numeric ID)
3. You'll need:
   - Marketing list ID
   - Tips & Tutorials list ID
   - User Insights list ID

## Step 2: Choose Configuration Method

You have two options:

### Option A: Firestore Config (Recommended) ⭐

**Advantages:**
- ✅ No redeployment needed to update IDs
- ✅ Easy to update via Firebase Console
- ✅ Can be updated programmatically

**Setup:**

1. **Via Firebase Console:**
   - Go to Firebase Console → Firestore Database
   - Create a new document:
     - Collection: `brevo_config`
     - Document ID: `templates`
   - Add the following fields:

```json
{
  "templates": {
    "verification": 123,
    "passwordReset": 124,
    "welcome": 125,
    "subscriptionChange": 126,
    "generic": 127
  },
  "contactLists": {
    "marketing": 65,
    "tips": 66,
    "insights": 67
  },
  "sender": {
    "email": "noreply@hungr.com",
    "name": "Hungr"
  },
  "updatedAt": "2025-01-27T10:00:00Z"
}
```

2. **Via Script (Alternative):**
   ```bash
   cd functions
   export BREVO_TEMPLATE_VERIFICATION=123
   export BREVO_TEMPLATE_PASSWORD_RESET=124
   export BREVO_TEMPLATE_WELCOME=125
   export BREVO_TEMPLATE_SUBSCRIPTION_CHANGE=126
   export BREVO_TEMPLATE_GENERIC=127
   export BREVO_LIST_MARKETING=65
   export BREVO_LIST_TIPS=66
   export BREVO_LIST_INSIGHTS=67
   export BREVO_SENDER_EMAIL="noreply@hungr.com"
   export BREVO_SENDER_NAME="Hungr"
   
   npx ts-node src/scripts/setupBrevoConfig.ts
   ```

### Option B: Environment Variables

**Advantages:**
- ✅ Works with Firebase Functions runtime config
- ✅ Can be set via Firebase CLI

**Setup:**

For Firebase Functions v2, you can set runtime config:

```bash
# Note: Firebase Functions v2 uses different config system
# You may need to use .env files or runtime config

# For local development, create .env file in functions/ directory:
BREVO_TEMPLATE_VERIFICATION=123
BREVO_TEMPLATE_PASSWORD_RESET=124
BREVO_TEMPLATE_WELCOME=125
BREVO_TEMPLATE_SUBSCRIPTION_CHANGE=126
BREVO_TEMPLATE_GENERIC=127
BREVO_LIST_MARKETING=65
BREVO_LIST_TIPS=66
BREVO_LIST_INSIGHTS=67
BREVO_SENDER_EMAIL=noreply@hungr.com
BREVO_SENDER_NAME=Hungr
```

**Note:** Firebase Functions v2 doesn't use `functions:config:set` the same way as v1. For production, you may need to:
- Use Firestore config (Option A) - recommended
- Or set environment variables in your deployment pipeline
- Or use Firebase Functions runtime config API

## Step 3: Verify Configuration

After setting up, test the configuration:

1. **Check Firestore Config:**
   ```bash
   # In Firebase Console, verify the document exists at:
   # Collection: brevo_config
   # Document: templates
   ```

2. **Test Email Sending:**
   - Create a test user account
   - Verify emails are sent with correct templates
   - Check `email_logs` collection for successful sends

3. **Test Contact Lists:**
   - Update user preferences
   - Verify contacts are added/removed in Brevo dashboard
   - Check `contact_list_logs` collection

## Configuration Priority

The system checks configuration in this order:

1. **Firestore Config** (`brevo_config/templates`) - checked first
2. **Environment Variables** - used as fallback if Firestore config doesn't exist

## Updating Configuration

### Update Firestore Config (Recommended)

1. Go to Firebase Console → Firestore
2. Navigate to `brevo_config/templates`
3. Update the fields you need
4. Save - changes take effect within 5 minutes (cache TTL)

### Update Environment Variables

1. Update your `.env` file or deployment config
2. Redeploy functions:
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions
   ```

## Troubleshooting

### "No template configured" Error

- Verify template IDs are set correctly
- Check that at least `generic` template ID is set
- Verify IDs are numeric (not strings)

### "No contact list configured" Error

- Verify contact list IDs are set correctly
- Check that all three lists (marketing, tips, insights) are configured
- Verify IDs are numeric (not strings)

### Configuration Not Loading

- Check Firestore document exists: `brevo_config/templates`
- Verify document structure matches expected format
- Check function logs for configuration errors
- Wait 5 minutes for cache to refresh

## Example Configuration Document

Here's a complete example of what the Firestore document should look like:

```json
{
  "templates": {
    "verification": 123,
    "passwordReset": 124,
    "welcome": 125,
    "subscriptionChange": 126,
    "generic": 127
  },
  "contactLists": {
    "marketing": 65,
    "tips": 66,
    "insights": 67
  },
  "sender": {
    "email": "noreply@hungr.com",
    "name": "Hungr"
  },
  "updatedAt": {
    "_seconds": 1706356800,
    "_nanoseconds": 0
  }
}
```

## Next Steps

After configuration is complete:

1. ✅ Create Firestore indexes (see tasks.md T015-T016)
2. ✅ Test email sending with real templates
3. ✅ Verify contact list sync works
4. ✅ Monitor `email_logs` and `contact_list_logs` collections














