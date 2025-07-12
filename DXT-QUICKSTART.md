# Like-I-Said DXT Quick Start Guide

## For Users: Install in 30 Seconds

### 1. Download
Download the latest `like-i-said-v2.dxt` file from:
- [GitHub Releases](https://github.com/endlessblink/Like-I-Said-Memory-V2/releases)

### 2. Install
1. Open Claude Desktop
2. Go to **Settings → Extensions**  
3. Click **"Install from file"** or drag the `.dxt` file into the window
4. Done! The extension is now active

### 3. Test
Type in Claude: **"Test Like-I-Said memory tools"**

You should see a response confirming the tools are available.

### 4. Access Dashboard (Optional)
Open your browser to: **http://localhost:3001**

---

## For Developers: Build Your Own DXT

### Prerequisites
- Node.js 18+
- npm or yarn

### Build Steps

```bash
# Clone the repository
git clone https://github.com/endlessblink/Like-I-Said-Memory-V2.git
cd Like-I-Said-Memory-V2

# Install dependencies
npm install

# Build the DXT package
npm run build:dxt

# Find your package in:
# dist/like-i-said-v2-[version].dxt
```

### Validate Your Build

```bash
npm run validate:dxt dist/like-i-said-v2-*.dxt
```

---

## Troubleshooting

### Extension Not Loading
- Ensure Claude Desktop is updated to the latest version
- Check Extensions → View Logs for errors

### Dashboard Not Accessible  
- Check if port 3001 is available
- Ensure "enableDashboard" is true in extension settings

### Tools Not Available
- Restart Claude Desktop after installation
- Verify extension status shows "Active"

---

## Need Help?

- 📖 [Full Documentation](./DXT-GUIDE.md)
- 🐛 [Report Issues](https://github.com/endlessblink/Like-I-Said-Memory-V2/issues)
- 💬 [Discussions](https://github.com/endlessblink/Like-I-Said-Memory-V2/discussions)