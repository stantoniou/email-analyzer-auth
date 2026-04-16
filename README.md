# Email Contact Analyzer - Auth Redirect Page

This is the OAuth redirect handler for the Email Contact Analyzer browser extension.

## What This Does

When users sign in to the extension with their Microsoft account:
1. Extension opens authentication popup
2. User signs in with Microsoft
3. Azure AD redirects to this page
4. MSAL captures the token
5. Popup closes automatically
6. Extension continues with the token

## Files

- `auth-callback.html` - The OAuth redirect handler page
- `vercel.json` - Vercel deployment configuration

## Deployment Instructions

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Deploy" under "Import Git Repository" or upload these files
4. Upload both `auth-callback.html` and `vercel.json`
5. Click "Deploy"
6. Vercel will give you a URL like: `https://your-project.vercel.app`
7. Your redirect URL will be: `https://your-project.vercel.app/auth-callback.html`

### Option 2: Deploy via Git

1. Create a GitHub repository
2. Upload these files to the repo
3. Go to https://vercel.com/dashboard
4. Click "Add New..." → "Project"
5. Import your GitHub repository
6. Click "Deploy"

### Option 3: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to this folder
cd /path/to/this/folder

# Deploy
vercel

# Follow the prompts
# Choose a project name (e.g., "email-analyzer-auth")
```

## After Deployment

1. Note your Vercel URL (e.g., `https://email-analyzer-auth.vercel.app`)
2. Your full redirect URI is: `https://your-url.vercel.app/auth-callback.html`
3. Add this URI to Azure AD App Registration:
   - Go to Azure Portal → App Registrations → Email Contact Analyzer
   - Click "Authentication"
   - Under "Single-page application" click "Add URI"
   - Paste: `https://your-url.vercel.app/auth-callback.html`
   - Click "Save"
4. Update extension code to use this URL as redirectUri

## Custom Domain (Optional)

Later, you can add a custom domain:
1. Buy a domain (e.g., `emailanalyzer.com`)
2. In Vercel dashboard → Settings → Domains
3. Add your custom domain
4. Update DNS records as instructed
5. Update Azure AD redirect URI to use custom domain

## Testing

After deployment, visit your URL directly:
- `https://your-url.vercel.app/auth-callback.html`
- You should see: "Completing Sign In" page
- This confirms it's deployed correctly

## Security Notes

- HTTPS enabled by default
- CORS headers configured for extension access
- No sensitive data stored
- Minimal page - just handles redirect

## Support

If you have issues deploying, check:
- Vercel dashboard for deployment logs
- Browser console for errors
- Azure AD redirect URI matches exactly
