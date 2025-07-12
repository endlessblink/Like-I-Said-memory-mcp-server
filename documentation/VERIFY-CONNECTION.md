# Verify Your Syncthing Connection

## Quick Check in Both Web Interfaces

### 1. Check WSL Syncthing (http://localhost:8384)
- **Devices section**: Should show "Windows Local" (or similar) as CONNECTED
- **Folders section**: Should show "like-i-said-mcp" folder
- **Folder status**: Should say "Up to Date" if syncing properly

### 2. Check Windows Syncthing (http://localhost:8385)
- **Devices section**: Should show "WSL Local" (or similar) as CONNECTED
- **Folders section**: Should show "like-i-said-mcp" folder
- **Folder path**: Should be `D:\APPSNospaces\Like-I-said-mcp-server-v2`

## If NOT Connected:

### Step 1: Add Devices to Each Other

**In WSL Syncthing (http://localhost:8384):**
1. Click "Add Device"
2. Get Windows Device ID from http://localhost:8385 (Actions → Show ID)
3. Paste it in Device ID field
4. Device Name: "Windows Local"
5. Under Advanced tab:
   - Addresses: `tcp://127.0.0.1:22001`
6. Save

**In Windows Syncthing (http://localhost:8385):**
1. Click "Add Device"
2. Device ID: `L3H6WRG-TIDBWRH-IQU562R-DPSQNRP-H6XNPDH-5MM2KSQ-4ZHLX2B-JFTMQQM`
3. Device Name: "WSL Local"
4. Under Advanced tab:
   - Addresses: `tcp://127.0.0.1:22000`
5. Save

### Step 2: Share the Folder

**In WSL Syncthing (http://localhost:8384):**
1. Click on the folder "like-i-said-mcp"
2. Click "Edit"
3. Go to "Sharing" tab
4. Check the box next to "Windows Local"
5. Save

**In Windows Syncthing (http://localhost:8385):**
1. You'll see a notification about a new folder
2. Click "Add"
3. Change the Folder Path to: `D:\APPSNospaces\Like-I-said-mcp-server-v2`
4. Keep Folder ID as: `like-i-said-mcp`
5. Save

## Test the Connection

Create a file in WSL:
```bash
echo "Sync test $(date)" > test-sync.txt
```

Check if it appears in Windows:
```bash
cat /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/test-sync.txt
```

If you see the file content, it's working!