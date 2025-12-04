# Brevo Configuration Setup

This directory contains scripts to set up Brevo template IDs and contact list IDs.

## Quick Start

1. **Edit the bash script** with your actual Brevo IDs:
   ```bash
   nano setup-brevo-config.sh
   # or
   code setup-brevo-config.sh
   ```

2. **Update the values** at the top of the script:
   - Template IDs (from Brevo Dashboard → Transactional → Templates)
   - Contact List IDs (from Brevo Dashboard → Contacts → Lists)
   - Sender email and name

3. **Run the script**:
   ```bash
   ./setup-brevo-config.sh
   ```

## Available Scripts

### Option 1: TypeScript Script (Recommended)

**File:** `setup-brevo-config.sh`

**How it works:**
- Sets environment variables
- Runs TypeScript setup script
- Writes configuration to Firestore

**Requirements:**
- Node.js and npm installed
- Firebase Admin SDK credentials configured
- TypeScript dependencies installed

**Usage:**
```bash
./setup-brevo-config.sh
```

### Option 2: Firebase CLI Script

**File:** `setup-brevo-config-firebase-cli.sh`

**How it works:**
- Uses Firebase CLI to write directly to Firestore
- No TypeScript compilation needed

**Requirements:**
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase CLI authenticated (`firebase login`)

**Usage:**
```bash
./setup-brevo-config-firebase-cli.sh
```

## Finding Your Brevo IDs

### Template IDs

1. Log in to [Brevo Dashboard](https://app.brevo.com)
2. Navigate to **Transactional** → **Templates**
3. Click on each template to view details
4. The **Template ID** is shown as a number (e.g., 123, 456)

**Required Templates:**
- Verification email
- Password reset
- Welcome email
- Subscription change
- Generic/fallback (required minimum)

### Contact List IDs

1. Navigate to **Contacts** → **Lists** in Brevo Dashboard
2. Click on each list to view details
3. The **List ID** is shown as a number (e.g., 65, 66)

**Required Lists:**
- Marketing
- Tips & Tutorials
- User Insights

## Configuration Values

Edit these in the bash script:

```bash
# Template IDs
BREVO_TEMPLATE_VERIFICATION=123
BREVO_TEMPLATE_PASSWORD_RESET=124
BREVO_TEMPLATE_WELCOME=125
BREVO_TEMPLATE_SUBSCRIPTION_CHANGE=126
BREVO_TEMPLATE_GENERIC=127

# Contact List IDs
BREVO_LIST_MARKETING=65
BREVO_LIST_TIPS=66
BREVO_LIST_INSIGHTS=67

# Sender Configuration
BREVO_SENDER_EMAIL="noreply@hungr.com"
BREVO_SENDER_NAME="Hungr"
```

## Verification

After running the script, verify the configuration:

1. **Firebase Console:**
   - Go to Firestore Database
   - Navigate to `brevo_config` collection
   - Open `templates` document
   - Verify all values are correct

2. **Test Email Sending:**
   - Create a test user account
   - Check `email_logs` collection for successful sends
   - Verify emails are received

3. **Test Contact Lists:**
   - Update user preferences
   - Check Brevo dashboard for contact additions/removals
   - Check `contact_list_logs` collection

## Troubleshooting

### Script Fails with "Firebase Admin initialization error"

**Solution:** Ensure Firebase credentials are configured:
- For local: Place `serviceAccountKey.json` in project root
- Or use: `gcloud auth application-default login`

### Script Fails with "Template ID must be set"

**Solution:** Edit the script and set at least `BREVO_TEMPLATE_GENERIC` to a valid template ID.

### Configuration Not Loading

**Solution:**
- Verify Firestore document exists at `brevo_config/templates`
- Check document structure matches expected format
- Wait 5 minutes for cache to refresh (config is cached)

## Manual Setup (Alternative)

If scripts don't work, you can manually create the Firestore document:

1. Go to Firebase Console → Firestore Database
2. Create collection: `brevo_config`
3. Create document: `templates`
4. Add fields as shown in `SETUP_CONFIG.md`

## Next Steps

After configuration is complete:

1. ✅ Create Firestore indexes (see tasks.md T015-T016)
2. ✅ Test email sending with real templates
3. ✅ Verify contact list sync works
4. ✅ Monitor `email_logs` and `contact_list_logs` collections












