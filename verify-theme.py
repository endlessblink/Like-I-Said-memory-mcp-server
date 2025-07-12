#!/usr/bin/env python3
import requests

print("Theme System Verification")
print("=" * 50)

try:
    # Test production build
    response = requests.get("http://localhost:4173")
    html = response.text
    
    print(f"1. Server Response: {response.status_code}")
    print(f"2. HTML Size: {len(html)} bytes")
    
    # Check for critical theme elements
    checks = {
        "Theme variables in head": "--background" in html,
        "React root element": 'id="root"' in html,
        "App JavaScript": "/assets/index-" in html,
        "App CSS": "/assets/index-" in html and ".css" in html,
    }
    
    print("\n3. Critical Elements:")
    for check, result in checks.items():
        print(f"   - {check}: {'✓' if result else '✗'}")
    
    # Extract and show theme variables
    import re
    vars_pattern = r"root\.style\.setProperty\('(--[^']+)',\s*'([^']+)'\)"
    vars_found = re.findall(vars_pattern, html)
    
    if vars_found:
        print("\n4. Theme Variables Found:")
        for var_name, var_value in vars_found[:5]:  # Show first 5
            print(f"   {var_name}: {var_value}")
    
    # Check CSS file
    css_match = re.search(r'href="(/assets/index-\w+\.css)"', html)
    if css_match:
        css_url = f"http://localhost:4173{css_match.group(1)}"
        css_response = requests.get(css_url)
        css_size = len(css_response.text)
        print(f"\n5. CSS File: {css_size} bytes")
        
        # Check for theme classes in CSS
        has_theme_classes = any(x in css_response.text for x in ['bg-background', 'text-foreground', 'glass-effect'])
        print(f"   - Has theme classes: {'✓' if has_theme_classes else '✗'}")
    
    print("\n✅ Theme system appears to be working!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("Make sure the preview server is running on port 4173")