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

# 🧠 Like I Said v2.3.3 - מערכת זיכרון מתקדמת לבינה מלאכותית

[![npm version](https://img.shields.io/npm/v/@endlessblink/like-i-said-v2.svg)](https://www.npmjs.com/package/@endlessblink/like-i-said-v2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Support](https://img.shields.io/badge/Docker-Alpine%20Ready-blue)](./DOCKER-HE.md)

> **שרת זיכרון MCP לאסיסטנטים של בינה מלאכותית** - זכירת שיחות בין סשנים

תנו לאסיסטנטים של הבינה המלאכותית שלכם זיכרון מתמשך! שמרו מידע, העדפות והקשר ששרדים את הפסקות שיחה.

## ✨ תכונות עיקריות

- 🧠 **זיכרון מתמשך** - הAI זוכר בין שיחות שונות
- 🚀 **התקנה בפקודה אחת** - הגדרה אוטומטית לכל לקוחות הAI
- 🌍 **חוצה פלטפורמות** - Windows, macOS, Linux (כולל WSL)
- 📊 **לוח בקרה React** - ממשק אינטרנט מודרני עם עדכונים בזמן אמת
- 🔧 **6 כלי זיכרון** - חבילת ניהול זיכרון מלאה
- 📝 **אחסון Markdown** - frontmatter משופר עם קטגוריות וקשרים
- 🔍 **חיפוש מתקדם** - חיפוש full-text עם מסננים ותגיות
- 📈 **אנליטיקה** - סטטיסטיקות שימוש בזיכרון ותובנות
- 🎨 **ממשק מודרני** - עיצוב מבוסס כרטיסים עם ערכת נושא כהה
- 🐳 **תמיכה Docker מלאה** - פריסה ארגונית עם Alpine Linux

## 🚀 התקנה מהירה

### שלב 1: התקנת שרת MCP
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

תוכנת ההתקנה תבצע:
- ✅ זיהוי אוטומטי של לקוחות AI שלכם (Claude Desktop, Cursor, Windsurf)
- ✅ הגדרת הגדרות MCP באופן אוטומטי
- ✅ בדיקת פונקציונליות השרת
- ✅ שימור שרתי MCP קיימים

### שלב 2: הפעלת לוח הבקרה האינטרנטי (אופציונלי)
```bash
# התקנה גלובלית (מומלץ)
npm install -g @endlessblink/like-i-said-v2
like-i-said-v2 start

# או הרצה ישירה מ-npx
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 start
```

בקרו בכתובת `http://localhost:3001` לניהול זיכרון ויזואלי עם תובנות AI, סטטיסטיקות ומיפוי קשרים.

### שלב 3: פריסה עם Docker (לארגונים)
```bash
# התקנה והרצה עם Docker
npm install -g @endlessblink/like-i-said-v2@2.3.3
docker-compose up like-i-said-dashboard

# זמין בכתובת: http://localhost:3002
```

## 🛠️ 6 כלי הזיכרון המובנים

### 1. `add_memory` - הוספת זיכרונות
שמירת זיכרונות חדשים עם תמיכה בקטגוריות, תגיות ופרויקטים:
```javascript
// דוגמה לשימוש
{
  "content": "הלמדתי איך לפתור בעיות React hooks",
  "category": "code", 
  "project": "dashboard-v2",
  "tags": ["react", "hooks", "debugging"],
  "priority": "high"
}
```

### 2. `search_memories` - חיפוש חכם
חיפוש מתקדם בכל הזיכרונות:
- חיפוש בתוכן
- סינון לפי תגיות
- סינון לפי פרויקט
- חיפוש לפי קטגורית

### 3. `get_memory` - אחזור זיכרון
אחזור זיכרון ספציפי לפי ID עם כל המטא-דאטה.

### 4. `list_memories` - רשימת זיכרונות
קבלת רשימה מסוננת של זיכרונות עם אפשרויות מיון.

### 5. `delete_memory` - מחיקת זיכרונות  
מחיקה בטוחה של זיכרונות עם אישור.

### 6. `test_tool` - בדיקת תקינות
כלי לבדיקת תקינות החיבור והפונקציונליות.

## 🕸️ גרף קשרים אינטראקטיבי - חדש ב-v2.3.3!

### ויזואליזציה מתקדמת של קשרים בין זיכרונות
- **3,230+ קשרים** זוהו אוטומטית בין הזיכרונות
- **קשרים מבוססי תגיות** - רואים איך נושאים קשורים זה לזה
- **קשרים מבוססי פרויקטים** - הכל בהקשר הנכון
- **קשרים זמניים** - זיכרונות שנוצרו באותו זמן
- **ממשק אינטראקטיבי** - לחץ על צמתים לחקירה מעמיקה

### תכונות הגרף:
- 🔍 **זום וניווט** - חקרו את רשת הזיכרונות
- 🎯 **פילטרים חכמים** - הצגה לפי תגיות ספציפיות
- 📊 **מידע סטטיסטי** - ספירת קשרים ועוצמה
- 🎨 **עיצוב מותאם** - צבעים וגדלים לפי חשיבות

## 🐳 תמיכה Docker מלאה - Enterprise Ready

### יתרונות Docker ב-v2.3.3:
- ✅ **תמיכה Alpine Linux מלאה** - canvas rendering עובד בצורה מושלמת
- ✅ **React Force Graph** - ויזואליזציה של קשרים בסביבת container
- ✅ **בנייה אופטימלית** - ספריות גרף נפרדות (chunk של 200KB)
- ✅ **מוכן לייצור** - פריסה ארגונית ברמה גבוהה

### מקרי שימוש ארגוניים:
- 🏢 **צוותי פיתוח** - זיכרון משותף לכל הצוות
- ☁️ **פריסה בענן** - AWS, Azure, GCP
- 🔒 **אבטחה מתקדמת** - בידוד מלא עם שליטה על נתונים
- 📈 **סקלביליות** - תמיכה ב-Kubernetes

## 📊 ממשק המשתמש המתקדם

### לוח בקרה React מודרני
- **עיצוב כהה ומודרני** - ממשק נעים לעיניים
- **עדכונים בזמן אמת** - WebSocket connections
- **חיפוש מתקדם** - מסננים לפי תגיות, פרויקטים, תאריכים
- **אנליטיקה מפורטת** - סטטיסטיקות שימוש ובינה עסקית

### תכונות חדשות ב-v2.3.3:
- 🎯 **ניווט משופר** - מעבר קל בין זיכרונות
- 📝 **עריכה באתר** - עדכון זיכרונות ישירות מהלוח
- 🏷️ **ניהול תגיות חכם** - הצעות אוטומטיות לתגיות
- 📈 **דשבורד אנליטיקה** - תובנות על דפוסי השימוש

## 🔧 הגדרה מתקדמת

### התאמה ללקוחות AI שונים:

#### Claude Desktop
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

#### Cursor / Windsurf
הכלי מזהה ומגדיר אוטומטית את ההגדרות הנדרשות.

### הגדרות Docker מתקדמות:

#### docker-compose.yml לייצור:
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
      - ./backups:/app/backups
    environment:
      - NODE_ENV=production
      - MEMORIES_DIR=/app/memories
    command: >
      sh -c "npm install -g @endlessblink/like-i-said-v2@2.3.3 && 
             npx @endlessblink/like-i-said-v2 start:dashboard"
    restart: unless-stopped
```

## 📈 השוואה בין גרסאות

### מה היה בגרסה 1.x:
- ❌ ממשק בסיסי בלבד
- ❌ אין ויזואליזציה של קשרים
- ❌ אין תמיכה ב-Docker
- ❌ ניהול זיכרון מורכב
- ❌ אין אנליטיקה

### מה חדש בגרסה 2.3.3:
- ✅ **React Dashboard מתקדם** - ממשק חדש לחלוטין
- ✅ **6 כלי MCP מובנים** - פתרון שלם לזיכרון
- ✅ **אחסון Markdown** - frontmatter מתקדם עם קטגוריות
- ✅ **גרף קשרים אינטראקטיבי** - 3,230+ קשרים מוצגים
- ✅ **תמיכה Docker מלאה** - פריסה ארגונית
- ✅ **חיפוש ואנליטיקה** - תובנות על השימוש
- ✅ **עדכונים בזמן אמת** - טכנולוגיית WebSocket

## 💼 מקרי שימוש מומלצים

### 👥 צוותי פיתוח
- שיתוף ידע וקוד בין חברי צוות
- זיכרון ארכיטקטורת פרויקט
- מעקב אחר החלטות טכניות
- העברת ידע בין מפתחים

### 🏢 ארגונים
- מערכת זיכרון מרכזית לכל הארגון
- ציות לתקנות אבטחת מידע
- בקרת גישה מתקדמת
- גיבוי ושחזור אוטומטיים

### 🎯 מפתחים פרטיים
- זיכרון אישי מתמשך
- ארגון העדפות וסגנון קוד
- מעקב אחר פרויקטים מרובים
- למידה וזכירה של פתרונות

## 🔧 פתרון בעיות נפוצות

### הגרף לא נטען
**בעיה**: גרף הקשרים לא מוצג בדפדפן  
**פתרון**: ודאו שאתם משתמשים בגרסה 2.3.3+ עם תמיכת Alpine

### זיכרונות נמחקים
**בעיה**: זיכרונות נעלמים לאחר הפסקת container  
**פתרון**: ודאו שה-volume mount נכון: `-v ./memories:/app/memories`

### קונפליקט פורטים
**בעיה**: פורט 3001 תפוס  
**פתרון**: שנו את מיפוי הפורט: `-p 3003:3001`

### בעיות הרשאות
**בעיה**: לא ניתן לכתוב לתיקיית זיכרונות  
**פתרון**: תקנו הרשאות: `chmod 755 ./memories`

## 🔗 קישורים ומשאבים

### 📦 התקנה והורדה
- **NPM**: [@endlessblink/like-i-said-v2](https://www.npmjs.com/package/@endlessblink/like-i-said-v2)
- **GitHub**: [Like-I-Said-Memory-V2](https://github.com/endlessblink/Like-I-Said-Memory-V2)
- **Docker Hub**: Images לייצור

### 📚 תיעוד נוסף
- [מדריך Docker מפורט](./DOCKER-HE.md)
- [הוראות התקנה](./SETUP-HE.md)
- [מדריך פיתוח](./DEVELOPMENT-HE.md)

### 🆘 תמיכה וקהילה
- **דיווח באגים**: [GitHub Issues](https://github.com/endlessblink/Like-I-Said-Memory-V2/issues)
- **עדכונים**: `npm update -g @endlessblink/like-i-said-v2`
- **תמיכה**: צרו contact דרך GitHub

## 📄 רישיון

MIT License - ראו [LICENSE](./LICENSE) לפרטים נוספים.

---

## 🎉 מוכנים להתחיל?

### למפתחים:
```bash
npm install -g @endlessblink/like-i-said-v2@2.3.3
like-i-said-v2 install
```

### לארגונים:
```bash
docker-compose up --build like-i-said-dashboard
# זמין בכתובת: http://localhost:3002
```

**Like I Said v2.3.3** - תנו לאסיסטנט הAI שלכם זיכרון שמתמשך! 🧠✨

*האסיסטנט החכם שזוכר הכל, כדי שתוכלו להתרכז ביצירה* 🚀

---

<div class="english">
<p><strong>English Documentation:</strong> <a href="../README.md">README.md</a> | <a href="../DOCKER.md">Docker Guide</a></p>
</div>

</body>
</html>