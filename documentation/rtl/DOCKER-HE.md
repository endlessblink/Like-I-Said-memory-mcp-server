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
    </style>
</head>
<body>

# 🐳 מדריך שימוש Docker - Like I Said v2.3.3

## התחלה מהירה

### 1. התקנה מ-NPM
```bash
npm install -g @endlessblink/like-i-said-v2@2.3.3
```

### 2. הרצה עם Docker
```bash
# לוח בקרה פשוט
docker run -p 3002:3001 -v ./memories:/app/memories like-i-said-v2:latest

# גישה ללוח הבקרה: http://localhost:3002
```

### 3. Docker Compose (מומלץ)
```yaml
version: '3.8'
services:
  like-i-said-dashboard:
    image: node:20-alpine
    container_name: like-i-said-memory
    ports:
      - "3002:3001"
    volumes:
      - ./memories:/app/memories
    environment:
      - NODE_ENV=production
      - MEMORIES_DIR=/app/memories
    command: >
      sh -c "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start:dashboard"
```

## למה Docker ל-Like I Said? 🚀

### **פריסות ארגוניות וצוותיות**
- **מערכות זיכרון מבודדות**: כל צוות מקבל זיכרון containerized משלו
- **סביבות עקביות**: התנהגות זהה בין dev, staging ו-production
- **סקלביליות קלה**: מוכן ל-Kubernetes לפריסות ארגוניות

### **זרימות עבודה לפיתוח AI**
- **זיכרון מתמשך**: שורד הפעלות מחדש של container ואתחולי host
- **חוצה פלטפורמות**: עובד זהה ב-Windows, Mac, Linux
- **ללא קונפליקטים**: מבודד מtendencies פיתוח מקומיות

### **פריסות ענן ושרת**
- **מוכן ל-AWS/Azure/GCP**: פריסה בכל פלטפורמת ענן
- **Auto-Scaling**: תמיכה בתזמון Kubernetes
- **איזון עומסים**: מספר מופעי זיכרון מאחורי load balancer

### **פרטיות Self-Hosted**
- **שליטה מלאה על נתונים**: הזיכרונות שלכם לעולם לא עוזבים את התשתית שלכם
- **אבטחה**: בידוד רשת ומדיניות אבטחה מותאמת
- **ציות לתקנות**: עמידה בדרישות residency של נתונים ארגוניים

## הגדרת Docker לייצור

### הגדרת ייצור מלאה
```yaml
version: '3.8'
services:
  like-i-said-mcp:
    image: node:20-alpine
    container_name: like-i-said-mcp-server
    volumes:
      - ./memories:/app/memories
      - ./backups:/app/backups
    environment:
      - NODE_ENV=production
    command: >
      sh -c "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start"
    restart: unless-stopped

  like-i-said-dashboard:
    image: node:20-alpine
    container_name: like-i-said-dashboard
    ports:
      - "3002:3001"
    volumes:
      - ./memories:/app/memories:ro
    environment:
      - NODE_ENV=production
      - MEMORIES_DIR=/app/memories
    command: >
      sh -c "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start:dashboard"
    restart: unless-stopped
    depends_on:
      - like-i-said-mcp

  # אופציונלי: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - like-i-said-dashboard
    restart: unless-stopped
```

## תאימות Alpine Linux ✅

### v2.3.3 כולל תמיכה מלאה ב-Alpine
- **Canvas Rendering**: ספריות cairo, pango, fontconfig כלולות
- **תלויות גרפיקה**: כל חבילות Alpine הנדרשות
- **Native Modules**: שכבת תאימות glibc מתאימה
- **React Force Graph**: תמיכה מלאה בויזואליזציה של קשרים

### מה תוקן ב-v2.3.3:
```dockerfile
# תלויות אלה מטופלות אוטומטית כעת
RUN apk add --no-cache \
    build-base cairo-dev pango-dev fontconfig \
    ttf-freefont glib-dev python3 wget
```

## התמדה של זיכרון

### מבנה volume מומלץ
```
./memories/                 # אחסון זיכרון ראשי
├── 2025-06-22--memory-1.md
├── 2025-06-22--memory-2.md
└── ...

./backups/                  # גיבויים אוטומטיים
├── daily/
├── weekly/
└── monthly/

./config/                   # הגדרות
├── docker-compose.yml
└── nginx.conf
```

### אסטרטגיית גיבוי
```bash
# עבודת cron לגיבוי יומי
0 2 * * * docker exec like-i-said-mcp-server tar -czf /app/backups/daily/memories-$(date +\%Y-\%m-\%d).tar.gz /app/memories/
```

## אינטגרציה עם Claude/Cursor

### הגדרת MCP עבור Docker
```json
{
  "mcpServers": {
    "like-i-said-memory": {
      "command": "docker",
      "args": ["exec", "like-i-said-mcp-server", "npx", "@endlessblink/like-i-said-v2", "start"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### VS Code/Cursor Dev Container
```json
{
  "name": "Like I Said Memory Environment",
  "dockerComposeFile": "docker-compose.yml",
  "service": "like-i-said-dashboard",
  "workspaceFolder": "/workspace",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    }
  }
}
```

## ביצועים וסקלביליות

### דרישות משאבים
- **מינימום**: 512MB RAM, 1 CPU core
- **מומלץ**: 1GB RAM, 2 CPU cores
- **אחסון**: 10GB+ לאוספי זיכרון גדולים
- **רשת**: פורט 3001 (dashboard), 3000 (MCP server)

### פריסת Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: like-i-said-memory
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
      - name: like-i-said
        image: node:20-alpine
        command: ["/bin/sh", "-c"]
        args: 
          - "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start:dashboard"
        ports:
        - containerPort: 3001
        volumeMounts:
        - name: memory-storage
          mountPath: /app/memories
        env:
        - name: NODE_ENV
          value: "production"
      volumes:
      - name: memory-storage
        persistentVolumeClaim:
          claimName: like-i-said-pvc
```

## פתרון בעיות

### בעיות נפוצות

#### 1. הגרף לא נטען
**בעיה**: גרף הקשרים מוצג ריק  
**פתרון**: ודאו שמשתמשים בגרסה 2.3.3+ עם תלויות Alpine

#### 2. התמדה של זיכרון
**בעיה**: זיכרונות נאבדים בהפעלה מחדש של container  
**פתרון**: אמתו volume mounting: `-v ./memories:/app/memories`

#### 3. קונפליקטי פורטים
**בעיה**: פורט 3001 כבר בשימוש  
**פתרון**: שנו מיפוי פורט: `-p 3003:3001`

#### 4. בעיות הרשאות
**בעיה**: לא ניתן לכתוב לתיקיית זיכרון  
**פתרון**: תקנו הרשאות: `chmod 755 ./memories`

### פקודות debug
```bash
# בדוק מצב container
docker ps | grep like-i-said

# צפה ב-logs
docker logs like-i-said-dashboard

# בדוק שרת MCP
docker exec like-i-said-mcp-server npx @endlessblink/like-i-said-v2 test

# אמת קבצי זיכרון
docker exec like-i-said-dashboard ls -la /app/memories
```

## שיקולי אבטחה

### אבטחת ייצור
- **בידוד רשת**: השתמש ברשתות Docker מותאמות
- **מערכות קבצים לקריאה בלבד**: mount זיכרונות כ-read-only במקום שאפשר
- **User Namespaces**: הרץ containers כ-non-root user
- **ניהול סודות**: השתמש ב-Docker secrets להגדרות רגישות

### דוגמה להגדרה בטוחה
```yaml
services:
  like-i-said:
    image: node:20-alpine
    user: "1000:1000"  # Non-root user
    read_only: true    # Read-only filesystem
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
```

## תמיכה ועדכונים

### ניהול גרסאות
```bash
# בדוק גרסה נוכחית
docker exec like-i-said-dashboard npm list -g @endlessblink/like-i-said-v2

# עדכן לגרסה אחרונה
docker exec like-i-said-dashboard npm update -g @endlessblink/like-i-said-v2

# גרסה ספציפית
docker exec like-i-said-dashboard npm install -g @endlessblink/like-i-said-v2@2.3.3
```

### קבלת עזרה
- **GitHub Issues**: [Like-I-Said-Memory-V2/issues](https://github.com/endlessblink/Like-I-Said-Memory-V2/issues)
- **Docker Hub**: Docker images לייצור
- **NPM**: [@endlessblink/like-i-said-v2](https://www.npmjs.com/package/@endlessblink/like-i-said-v2)

## מקרי שימוש מתקדמים

### צוותי פיתוח
```bash
# זיכרון משותף לצוות
version: '3.8'
services:
  team-memory:
    image: node:20-alpine
    ports:
      - "3002:3001"
    volumes:
      - team-memories:/app/memories
      - ./team-config:/app/config
    environment:
      - TEAM_NAME=development
      - ACCESS_CONTROL=enabled
```

### פריסה בענן
```yaml
# AWS ECS / Azure Container Instances
version: '3.8'
services:
  like-i-said-cloud:
    image: node:20-alpine
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    volumes:
      - type: bind
        source: /efs/memories  # AWS EFS
        target: /app/memories
```

### מוניטורינג ולוגים
```yaml
# אינטגרציה עם ELK Stack
services:
  like-i-said:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.memory.rule=Host(`memory.company.com`)"
```

---

## 🎯 מוכנים לפריסה ארגונית?

### למפתחים:
```bash
# התקנה מקומית עם Docker
git clone https://github.com/endlessblink/Like-I-Said-Memory-V2
cd Like-I-Said-Memory-V2
docker-compose up like-i-said-dashboard
```

### לארגונים:
```bash
# פריסה בענן עם high availability
kubectl apply -f kubernetes/
# או
docker stack deploy -c docker-stack.yml like-i-said
```

**Like I Said v2.3.3** - מערכת זיכרון מתקדמת לבינה מלאכותית עם תמיכה Docker מלאה! 🐳✨

*פתרון זיכרון enterprise-grade לצוותי פיתוח AI* 🚀

---

<div class="english">
<p><strong>English Documentation:</strong> <a href="../DOCKER.md">Docker Guide</a> | <a href="../README.md">Main README</a></p>
</div>

</body>
</html>