# 🔒 Privacy Policy - Like-I-Said Memory Server

**Effective Date**: July 13, 2025  
**Last Updated**: July 13, 2025

## Our Commitment to Privacy

At Like-I-Said Memory Server, your privacy is not just important to us—it's fundamental to our design philosophy. We believe powerful tools should enhance your productivity without compromising your privacy.

---

## What This Policy Covers

This privacy policy applies to:
- Like-I-Said Memory Server v2.4.0 and later
- Optional analytics and telemetry features
- Data collection practices
- Your rights and choices

---

## The Simple Version

**We don't collect your personal data or content. Period.**

Our optional analytics only track anonymous usage patterns to help us improve the software. Everything is anonymous, opt-in only, and you can disable it anytime.

---

## Data Collection Principles

### 1. 🔒 Privacy by Design
- **Anonymous by default** - No personal information collected
- **Opt-in only** - Analytics disabled by default
- **Transparent** - Clear about what we collect
- **Minimal** - Only essential metrics
- **Secure** - Encrypted transmission

### 2. 🛡️ Data Sovereignty
- **Your data stays yours** - Memories and tasks stored locally
- **No cloud requirement** - Works completely offline
- **You control everything** - Enable/disable features as needed

### 3. ✅ User Control
- **Easy opt-out** - Disable anytime with one command
- **Clear status** - Always know what's enabled
- **No dark patterns** - Honest, straightforward choices

---

## What We Collect (When Analytics is Enabled)

### ✅ Anonymous Usage Metrics
When you opt-in to analytics, we collect:

**Tool Usage Patterns**
- Which MCP tools you use (add_memory, create_task, etc.)
- How often you use different features
- Success/error rates for operations
- Performance metrics (response times)

**System Information**
- Operating system (Windows, macOS, Linux)
- Node.js version
- Installation type (DXT vs manual)
- Timezone (for usage pattern analysis)

**Usage Statistics**
- Session duration
- Number of tools used per session
- General activity levels
- Error frequencies

### ❌ What We Never Collect

**Personal Information**
- No names, emails, or contact information
- No IP addresses or location data
- No device identifiers or hardware info

**Your Content**
- Never your memories or their content
- Never your tasks or their details
- Never file paths or names
- Never search queries or terms

**System Details**
- No file system structure
- No installed software lists
- No network configuration
- No other applications data

---

## How Analytics Works

### Anonymous Identification
- **Installation ID**: Random UUID generated locally
- **Session ID**: Temporary identifier for each session
- **No tracking across devices** - Each installation is independent
- **No user profiling** - Cannot link data to individuals

### Data Transmission
- **Encrypted HTTPS** - All data sent securely
- **Minimal payloads** - Only essential metrics
- **Fail-safe operation** - Analytics never breaks core functionality
- **Timeout protection** - Won't slow down your tools

### Data Storage
- **Aggregated only** - Individual events combined into patterns
- **No personal identifiers** - Cannot trace back to users
- **Retention limits** - Old data automatically deleted
- **Secure infrastructure** - Industry-standard protection

---

## Your Rights and Choices

### Complete Control
You have the right to:

**✅ Opt-in or Opt-out**
```
Enable:  configure_analytics enable
Disable: configure_analytics disable
Status:  configure_analytics status
```

**✅ Know What's Collected**
```
Privacy Policy: configure_analytics privacy
```

**✅ Local Data Control**
- Delete analytics config: Remove `data/analytics-config.json`
- View analytics data: Check config file contents
- Backup/restore: Standard file operations

### No Penalties
- **Full functionality** regardless of analytics choice
- **No features locked** behind analytics
- **No persistent nagging** to enable analytics
- **Respect your decision** - no re-asking

---

## Technical Implementation

### Local Storage
Analytics configuration stored in:
- **File**: `data/analytics-config.json`
- **Contents**: Settings, installation ID, opt-in date
- **Format**: Human-readable JSON
- **Location**: Your local machine only

### Network Communication
When analytics is enabled:
- **Endpoint**: `https://analytics.like-i-said.dev/v1/events`
- **Method**: HTTPS POST
- **Frequency**: Per-event (not batched)
- **Timeout**: 5 seconds max
- **Failure handling**: Silent (never blocks main features)

### Security Measures
- **No authentication required** - Cannot be linked to you
- **TLS encryption** - Data protected in transit
- **No cookies** - No tracking mechanisms
- **No JavaScript** - No web tracking

---

## Data Usage

### What We Do With Analytics Data

**Product Improvement**
- Identify most/least used features
- Find common error patterns
- Optimize performance bottlenecks
- Prioritize development roadmap

**Quality Assurance**
- Monitor success/failure rates
- Detect platform-specific issues
- Validate new feature adoption
- Ensure cross-platform compatibility

**Community Insights**
- Understand usage patterns
- Share aggregated statistics
- Guide documentation improvements
- Support community discussions

### What We Don't Do

**❌ Never Sell Data**
- No third-party sharing
- No marketing partnerships
- No data brokers
- No advertising networks

**❌ Never Profile Users**
- No behavioral analysis
- No demographic inference
- No user segmentation
- No individual tracking

**❌ Never Link Datasets**
- No cross-platform correlation
- No external data enrichment
- No identity resolution
- No social network analysis

---

## Third-Party Services

### Analytics Infrastructure
We use minimal third-party services:

**Hosting Provider**
- **Service**: Cloud hosting for analytics endpoint
- **Data**: Only aggregated, anonymous metrics
- **Location**: United States
- **Compliance**: SOC 2, GDPR compliant

**No Other Services**
- No analytics platforms (Google Analytics, etc.)
- No error tracking services (Sentry, etc.)
- No marketing tools
- No social media integrations

### Dependencies
Open-source libraries used:
- Standard Node.js modules only
- No tracking or analytics libraries
- No external API calls (except opt-in analytics)
- All dependencies are auditable

---

## Compliance and Legal

### Regulatory Compliance
- **GDPR**: Compliant (EU data protection)
- **CCPA**: Compliant (California privacy rights)
- **PIPEDA**: Compliant (Canadian privacy law)
- **Privacy Act**: Compliant (Australian privacy law)

### Legal Basis for Processing
When analytics is enabled:
- **Consent**: Explicit opt-in required
- **Legitimate Interest**: Product improvement
- **Lawful Basis**: User-provided consent

### Data Subject Rights
Under GDPR and similar laws:
- **Right to access**: View analytics config file
- **Right to rectification**: Modify config file
- **Right to erasure**: Delete analytics config
- **Right to portability**: Copy config file
- **Right to object**: Disable analytics
- **Right to restrict**: Disable specific features

---

## Children's Privacy

### Under 13 Protection
- **No targeted collection** from children
- **Parental guidance** recommended for setup
- **School usage**: Check institutional policies
- **Family sharing**: One analytics setting per installation

### Educational Use
For classroom or educational environments:
- **Disable analytics** for student privacy
- **Administrator control** over analytics settings
- **Compliance** with COPPA and similar laws
- **Documentation** for IT administrators

---

## Changes to This Policy

### Notification Process
We will notify you of material changes by:
- **Update notifications** in the software
- **GitHub release notes** with policy changes
- **Clear change summaries** highlighting modifications
- **30-day notice** before changes take effect

### Version Control
- **Semantic versioning** for policy changes
- **GitHub history** of all modifications
- **Community input** on proposed changes
- **Transparency** in decision-making

---

## International Transfers

### Data Location
Analytics data may be processed in:
- **United States** (primary)
- **European Union** (if enabled)
- **No other locations**

### Transfer Safeguards
- **Encryption in transit** (TLS 1.3)
- **Encryption at rest** (AES-256)
- **Access controls** (need-to-know basis)
- **Audit trails** (all access logged)

---

## Security Measures

### Technical Safeguards
- **No persistent identifiers** beyond installation
- **Automatic data deletion** after retention period
- **Minimal data collection** reducing attack surface
- **Secure transmission** preventing interception

### Organizational Safeguards
- **Privacy by design** in all development
- **Regular security reviews** of practices
- **Incident response** procedures in place
- **Staff training** on privacy principles

---

## Contact Information

### Questions or Concerns
If you have questions about this privacy policy:

**Primary Contact**
- **GitHub Issues**: [Report privacy concerns](https://github.com/endlessblink/like-i-said-mcp-server-v2/issues)
- **GitHub Discussions**: [Community discussion](https://github.com/endlessblink/like-i-said-mcp-server-v2/discussions)
- **Developer**: [@endlessblink](https://github.com/endlessblink)

### Response Time
- **GitHub Issues**: 48 hours for privacy concerns
- **General Questions**: 5-7 business days
- **Security Issues**: 24 hours
- **Data Requests**: 10 business days

---

## Additional Resources

### Technical Documentation
- **[Analytics Implementation](./lib/analytics-telemetry.js)** - Source code
- **[Integration Guide](./lib/analytics-integration.js)** - How it works
- **[Configuration Options](./README.md#analytics)** - User controls

### Community Resources
- **[Privacy Discussions](https://github.com/endlessblink/like-i-said-mcp-server-v2/discussions)** - Community feedback
- **[Security Documentation](./SECURITY.md)** - Security practices
- **[Contributing Guidelines](./CONTRIBUTING.md)** - Development standards

---

## Summary

**We respect your privacy. Analytics is optional, anonymous, and always under your control.**

Key points:
- ✅ **Privacy by default** - Analytics disabled initially
- ✅ **Your content is private** - Never collected or transmitted
- ✅ **Anonymous metrics only** - Cannot be linked to you
- ✅ **Easy opt-out** - Disable anytime with one command
- ✅ **Transparent practices** - Clear about what we collect
- ✅ **Your choice** - Full functionality regardless of analytics

Questions? Use `configure_analytics privacy` or visit our [GitHub repository](https://github.com/endlessblink/like-i-said-mcp-server-v2).

---

**Last Updated**: July 13, 2025  
**Version**: 1.0.0  
**Effective**: Immediately upon installation