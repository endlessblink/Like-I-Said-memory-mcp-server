# Setting up GitHub CLI Authentication

## Option 1: Interactive Login (Easiest)
```bash
gh auth login
```
Then follow the prompts:
- Choose: GitHub.com
- Choose: HTTPS
- Authenticate with: Login with a web browser (or paste token)

## Option 2: Using a Personal Access Token

1. Create a token at: https://github.com/settings/tokens/new
   - Give it a name like "Claude Code Push Access"
   - Select scopes:
     - `repo` (full control of private repositories)
     - `workflow` (if you have GitHub Actions)
   
2. Copy the token and run:
```bash
gh auth login --with-token
```
Then paste your token when prompted.

## Option 3: Direct Token Setup
```bash
echo "YOUR_GITHUB_TOKEN" | gh auth login --with-token
```

## Verify Authentication
```bash
gh auth status
```

## After Authentication
Once authenticated, I can push changes using:
```bash
gh repo clone endlessblink/Like-I-Said-memory-mcp-server . --force
git add -A
git commit -m "fix: Safe reintroduction of @xenova/transformers as optional dependency"
git push origin main
```