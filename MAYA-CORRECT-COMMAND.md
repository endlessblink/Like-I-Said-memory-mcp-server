# Correct Command for Maya

## The Issue
You're seeing the help screen, not the installer menu.

## The Solution

You need to add the word `install` at the end of the command:

```bash
npx -p @endlessblink/like-i-said-v2@2.6.5 like-i-said-v2 install
```

Note the `install` at the end!

## What Happens Next
1. After running the command above, you'll see a different menu
2. Type `1` and press Enter for auto-setup
3. Restart Claude Desktop
4. Test with "What MCP tools do you have?"

## Why This Happened
- Without `install`, you just see the help screen
- The help screen shows available commands but doesn't run them
- You need to explicitly run the `install` command

## Full Correct Process
```bash
# Step 1: Run the install command (note 'install' at the end)
npx -p @endlessblink/like-i-said-v2@2.6.5 like-i-said-v2 install

# Step 2: When you see the menu, type 1 and press Enter

# Step 3: Restart Claude Desktop

# Step 4: Success!
```