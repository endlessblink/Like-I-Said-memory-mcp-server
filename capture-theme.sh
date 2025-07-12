#!/bin/bash
# Use wkhtmltoimage to capture the page
wkhtmltoimage --width 1024 --height 768 http://localhost:5174 theme-test.png 2>/dev/null
echo "Screenshot saved as theme-test.png"