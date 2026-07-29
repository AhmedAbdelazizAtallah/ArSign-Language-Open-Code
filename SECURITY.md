# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

### Preferred Method

Email: **security@arabic-sign-language.ai**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Alternative: GitHub Security Advisories

1. Go to the repository's **Security** tab
2. Click **Report a vulnerability**
3. Fill in the details

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Fix Development**: Within 30 days (critical), 90 days (high/medium)
- **Public Disclosure**: After fix is released

## Disclosure Policy

- We follow **Coordinated Vulnerability Disclosure**
- Details shared publicly only after fix is available
- Credit given to reporters (unless anonymity requested)
- CVEs requested for significant vulnerabilities

## Best Practices for Users

### Deployment
- Always use HTTPS in production
- Keep dependencies updated
- Use strong `SECRET_KEY`
- Restrict `CORS_ORIGINS` to known domains
- Enable rate limiting
- Use non-root containers

### Data Handling
- No sensitive data in logs
- Encrypt data at rest (if using database)
- Validate all file uploads
- Sanitize user inputs

### Model Security
- Verify model file integrity
- Don't load untrusted ONNX models
- Monitor inference anomalies

## Security Features

### Implemented
- ✅ Input validation (Pydantic v2)
- ✅ File type/size validation
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Security headers (CSP, HSTS, etc.)
- ✅ Request ID tracking
- ✅ Structured audit logging
- ✅ Non-root Docker containers
- ✅ Dependency scanning in CI/CD
- ✅ Secret detection in pre-commit

### Planned
- 🔄 Authentication/Authorization
- 🔄 API key management
- 🔄 Audit log retention
- 🔄 Advanced threat detection

## Contact

Security Team: security@arabic-sign-language.ai
General Issues: GitHub Issues
Emergency: Include "SECURITY" in subject line