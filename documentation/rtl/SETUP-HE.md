<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; }
        .ltr { direction: ltr; text-align: left; }
        code { direction: ltr; text-align: left; display: inline-block; }
        pre { direction: ltr; text-align: left; }
        .english { direction: ltr; text-align: left; font-style: italic; color: #666; }
        .step { background: #f8f9fa; border-right: 4px solid #007acc; padding: 15px; margin: 10px 0; }
        .warning { background: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 10px 0; }
        .success { background: #d4edda; border-right: 4px solid #28a745; padding: 15px; margin: 10px 0; }
    </style>
</head>
<body>

# 🚀 מדריך התקנה מפורט - Like I Said v2.3.3

## סקירה כללית

המדריך הזה ילווה אתכם דרך כל התהליך של התקנה והגדרה של Like I Said v2.3.3 עבור סוגי משתמשים שונים.

## 📋 דרישות מערכת

### דרישות בסיסיות
- **Node.js**: גרסה 18+ (מומלץ 20)
- **npm**: גרסה 8+ (מגיע עם Node.js)
- **מערכת הפעלה**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18+)
- **זיכרון**: לפחות 2GB RAM זמין
- **דיסק**: 1GB שטח פנוי

### דרישות Docker (אופציונלי)
- **Docker**: גרסה 20.10+
- **Docker Compose**: גרסה 1.29+
- **זיכרון**: 4GB RAM (לcontainers)
- **דיסק**: 5GB נוסף לimages

## 🎯 התקנה לפי סוג משתמש

### 👤 משתמש פרטי - התקנה מהירה

<div class="step">
<h4>שלב 1: התקנה אוטומטית</h4>

```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

התוכנה תבצע אוטומטית:
- זיהוי לקוחות AI (Claude Desktop, Cursor, Windsurf)
- הגדרת MCP אוטומטית
- בדיקת תקינות
- יצירת תיקיית זיכרונות
</div>

<div class="step">
<h4>שלב 2: הפעלת הדשבורד (אופציונלי)</h4>

```bash
# התקנה גלובלית
npm install -g @endlessblink/like-i-said-v2@2.3.3
like-i-said-v2 start

# או ישירות
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 start
```

פתחו דפדפן ב: `http://localhost:3001`
</div>

### 👥 צוותי פיתוח - התקנה משותפת

<div class="step">
<h4>שלב 1: הכנת הסביבה</h4>

```bash
# יצירת תיקייה משותפת
mkdir team-memory-system
cd team-memory-system

# הורדת template
curl -O https://raw.githubusercontent.com/endlessblink/Like-I-Said-Memory-V2/main/docker-compose.yml
```
</div>

<div class="step">
<h4>שלב 2: הגדרת Docker Compose</h4>

```yaml
# docker-compose.yml
version: '3.8'
services:
  team-memory:
    image: node:20-alpine
    container_name: team-like-i-said
    ports:
      - "3002:3001"
    volumes:
      - ./team-memories:/app/memories
      - ./backups:/app/backups
    environment:
      - NODE_ENV=production
      - MEMORIES_DIR=/app/memories
      - TEAM_NAME=MyTeam
    command: >
      sh -c "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start:dashboard"
    restart: unless-stopped
```
</div>

<div class="step">
<h4>שלב 3: הפעלה והגדרה</h4>

```bash
# יצירת תיקיות
mkdir -p team-memories backups

# הפעלה
docker-compose up -d

# בדיקה
docker logs team-like-i-said
```

גישה: `http://localhost:3002`
</div>

### 🏢 ארגונים - פריסה ארגונית

<div class="step">
<h4>שלב 1: תכנון הארכיטקטורה</h4>

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │ -> │  Memory Cluster │ -> │   Database      │
│   (Nginx/HAProxy│    │  (3+ instances) │    │   (Persistent)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

מומלץ:
- 3+ instances לhigh availability
- Load balancer (Nginx/HAProxy)
- Shared storage (NFS/EFS)
- Monitoring (Prometheus/Grafana)
</div>

<div class="step">
<h4>שלב 2: הגדרת Kubernetes</h4>

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: like-i-said-enterprise
spec:
  replicas: 3
  selector:
    matchLabels:
      app: like-i-said
  template:
    metadata:
      labels:
        app: like-i-said
    spec:
      containers:
      - name: memory-server
        image: node:20-alpine
        command: ["/bin/sh", "-c"]
        args:
          - "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start:dashboard"
        ports:
        - containerPort: 3001
        volumeMounts:
        - name: shared-memory
          mountPath: /app/memories
        env:
        - name: NODE_ENV
          value: "production"
        - name: ENTERPRISE_MODE
          value: "true"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: shared-memory
        persistentVolumeClaim:
          claimName: memory-pvc
```
</div>

<div class="step">
<h4>שלב 3: פריסה מתקדמת</h4>

```bash
# יצירת namespace
kubectl create namespace memory-system

# פריסת האפליקציה
kubectl apply -f kubernetes/ -n memory-system

# הגדרת ingress
kubectl apply -f ingress.yaml -n memory-system

# מוניטורינג
kubectl apply -f monitoring/ -n memory-system
```
</div>

## 🔧 הגדרות לקוחות AI

### Claude Desktop

<div class="step">
<h4>הגדרה אוטומטית</h4>

התוכנה תזהה ותגדיר אוטומטית את Claude Desktop. אם צריך הגדרה ידנית:

```json
{
  "mcpServers": {
    "like-i-said-memory": {
      "command": "npx",
      "args": ["-p", "@endlessblink/like-i-said-v2", "like-i-said-v2", "start"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

מיקום קובץ ההגדרה:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
</div>

### Cursor IDE

<div class="step">
<h4>הגדרה במערכת</h4>

Cursor יזוהה אוטומטית. לאימות:

1. פתחו Cursor
2. לחצו `Ctrl+Shift+P` (Windows/Linux) או `Cmd+Shift+P` (Mac)
3. חפשו "MCP Settings"
4. אמתו ש-Like I Said מופיע ברשימה
</div>

### Windsurf

<div class="step">
<h4>הגדרה במערכת</h4>

גם Windsurf יוגדר אוטומטית. לבדיקה ידנית:

1. פתחו את ההגדרות ב-Windsurf
2. עברו לסקציית Extensions/MCP
3. ודאו ש-Like I Said Memory רשום ופעיל
</div>

## 🔒 הגדרות אבטחה

### אבטחה בסיסית

<div class="warning">
<h4>⚠️ שיקולי אבטחה חשובים</h4>

- השתמשו תמיד בהגדרות `NODE_ENV=production`
- הגדירו הרשאות תיקיות: `chmod 750 ./memories`
- עבור פריסות ארגוניות - השתמשו ב-HTTPS בלבד
- הגדירו גיבוי אוטומטי לזיכרונות חשובים
</div>

### הגדרת HTTPS

```bash
# יצירת תעודות SSL
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ./ssl/private.key \
    -out ./ssl/certificate.crt

# הגדרת Nginx
cat > nginx.conf << EOF
server {
    listen 443 ssl;
    server_name memory.yourcompany.com;
    
    ssl_certificate /etc/ssl/certificate.crt;
    ssl_certificate_key /etc/ssl/private.key;
    
    location / {
        proxy_pass http://like-i-said-dashboard:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF
```

### בקרת גישה

```yaml
# הגדרת בקרת גישה בסיסית
services:
  like-i-said:
    environment:
      - ACCESS_CONTROL=enabled
      - ALLOWED_USERS=user1,user2,admin
      - ADMIN_USERS=admin
      - AUTH_METHOD=basic
```

## 📊 מוניטורינג ולוגים

### הגדרת לוגים

<div class="step">
<h4>לוגים בסיסיים</h4>

```bash
# צפייה בלוגים בזמן אמת
docker logs -f like-i-said-dashboard

# שמירת לוגים לקובץ
docker logs like-i-said-dashboard > memory-system.log 2>&1
```
</div>

### מוניטורינג מתקדם

```yaml
# docker-compose עם מוניטורינג
version: '3.8'
services:
  like-i-said:
    # ... הגדרות בסיסיות
    labels:
      - "prometheus.io/scrape=true"
      - "prometheus.io/port=3001"
      - "prometheus.io/path=/metrics"
    
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🔧 פתרון בעיות נפוצות

### בעיית התקנה

<div class="warning">
<h4>שגיאה: "npm install failed"</h4>

**סיבות אפשריות:**
- גרסת Node.js ישנה
- בעיות רשת/firewall
- מחסור בשטח דיסק

**פתרון:**
```bash
# עדכון Node.js
nvm install 20
nvm use 20

# ניקוי cache
npm cache clean --force

# התקנה מחדש
npm install -g @endlessblink/like-i-said-v2@2.3.3
```
</div>

### בעיות Docker

<div class="warning">
<h4>שגיאה: "Container fails to start"</h4>

**בדיקות:**
```bash
# בדוק סטטוס
docker ps -a

# צפה בלוגים
docker logs container-name

# בדוק משאבים
docker stats

# אתחל containers
docker-compose restart
```
</div>

### בעיות זיכרון

<div class="warning">
<h4>זיכרונות לא נשמרים</h4>

**בדיקות:**
1. אמת volume mounting: `docker inspect container-name`
2. בדוק הרשאות: `ls -la ./memories`
3. אמת שטח דיסק: `df -h`

**פתרון:**
```bash
# תיקון הרשאות
sudo chown -R 1000:1000 ./memories
chmod -R 755 ./memories

# בדיקת volume
docker volume inspect memory-volume
```
</div>

## ✅ אימות התקנה

### בדיקות בסיסיות

<div class="success">
<h4>✅ רשימת בדיקות להשלמת התקנה</h4>

```bash
# 1. בדוק גרסה
like-i-said-v2 --version

# 2. בדוק שרת MCP
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | \
    npx @endlessblink/like-i-said-v2 start

# 3. בדוק דשבורד
curl http://localhost:3001/api/status

# 4. בדוק זיכרונות
curl http://localhost:3001/api/memories

# 5. בדוק Docker (אם רלוונטי)
docker ps | grep like-i-said
```

**תוצאות מצופות:**
- ✅ גרסה 2.3.3 מוצגת
- ✅ 6 כלי MCP זמינים
- ✅ דשבורד עונה
- ✅ API פועל
- ✅ Container רץ
</div>

### בדיקת פונקציונליות

```bash
# יצירת זיכרון דוגמה
curl -X POST http://localhost:3001/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "content": "זה זיכרון בדיקה",
    "category": "test",
    "tags": ["בדיקה", "התקנה"]
  }'

# אחזור הזיכרון
curl http://localhost:3001/api/memories

# חיפוש
curl "http://localhost:3001/api/memories?search=בדיקה"
```

## 📞 קבלת תמיכה

### משאבי עזרה עצמית
- **תיעוד מלא**: [Documentation](../README.md)
- **מדריך Docker**: [Docker Guide](./DOCKER-HE.md)
- **שאלות נפוצות**: [FAQ](./FAQ-HE.md)

### תמיכה קהילתית
- **GitHub Issues**: [דיווח בעיות](https://github.com/endlessblink/Like-I-Said-Memory-V2/issues)
- **GitHub Discussions**: [דיונים וטיפים](https://github.com/endlessblink/Like-I-Said-Memory-V2/discussions)

### תמיכה ארגונית
לארגונים הזקוקים לתמיכה מקצועית:
- צרו קשר דרך GitHub
- תמיכה בהגדרת Kubernetes
- ייעוץ ארכיטקטורה
- הכשרת צוותים

---

## 🎉 התקנה הושלמה בהצלחה!

<div class="success">
<h4>🎯 השלבים הבאים</h4>

1. **התחילו להשתמש**: פתחו את Claude/Cursor והתחילו לשמור זיכרונות
2. **חקרו הדשבורד**: בקרו ב-`http://localhost:3001`
3. **הגדירו גיבוי**: הגדירו גיבוי אוטומטי לזיכרונות
4. **הצטרפו לקהילה**: עקבו אחר עדכונים ב-GitHub

**Like I Said v2.3.3** מוכן לשימוש! 🧠✨
</div>

---

<div class="english">
<p><strong>English Documentation:</strong> <a href="../SETUP-INSTRUCTIONS.md">Setup Instructions</a> | <a href="../README.md">Main README</a></p>
</div>

</body>
</html>