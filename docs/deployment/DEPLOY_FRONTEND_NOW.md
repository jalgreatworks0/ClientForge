# Deploy ClientForge Frontend - Quick Guide

## ⚡ FASTEST METHOD (2 minutes)

Your render.yaml is already configured correctly. Here's the absolute fastest way:

### Step 1: Go to Render Dashboard
**Open**: https://dashboard.render.com

### Step 2: Click "New +" Button
Located in the top-right corner

### Step 3: Select "Static Site"
From the dropdown menu

### Step 4: Connect Repository
- **Repository**: Select `jalgreatworks0/ClientForge`
- **Branch**: `main`
- Click **"Connect"**

### Step 5: Fill in the Form
Copy and paste these EXACT values:

```
Name:              clientforge-crm-frontend
Root Directory:    (leave blank)
Build Command:     cd frontend && npm install && npm run build
Publish Directory: ./frontend/dist
Auto-Deploy:       Yes
```

### Step 6: Add Environment Variable
1. Scroll down and click **"Advanced"**
2. Click **"Add Environment Variable"**
3. Add:
   ```
   Key:   VITE_API_URL
   Value: https://clientforge.onrender.com
   ```

### Step 7: Click "Create Static Site"
Wait 3-5 minutes for build to complete.

---

## 🎉 Done!

Once deployed, Render will give you a URL like:
- `https://clientforge-crm-frontend.onrender.com`

Visit that URL to see your ClientForge CRM! 🚀

---

## 🔧 Alternative: Enable MCP Access (For Future)

If you want me to manage Render directly in the future:

1. **Get Render API Key**: https://dashboard.render.com/account/api-keys
2. **Configure MCP**: Follow instructions in `RENDER_MCP_INSTRUCTIONS.txt`
3. **Restart Claude Code**
4. Tell me: "List all my Render services"

Then I'll be able to create/manage services for you automatically!

---

## Need Help?

If the build fails or you see errors:
1. Take a screenshot of the Render build logs
2. Share them with me
3. I'll fix the issue immediately
