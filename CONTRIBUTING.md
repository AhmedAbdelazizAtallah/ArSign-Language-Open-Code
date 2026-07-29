# Contributing Guide

Thank you for contributing to the Arabic Sign Language Platform! This guide will help you get started.

## Getting Started

### Prerequisites

- Python 3.14+
- Node.js 20+
- Docker 24+ (optional)
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/arabic-sign-language-platform.git
cd arabic-sign-language-platform

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings

# Frontend setup (new terminal)
cd ../frontend
npm install
cp .env.example .env.local

# Start development servers
# Terminal 1: Backend
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

## Code Standards

### Python (Backend)

- **Formatter**: Ruff (`ruff format .`)
- **Linter**: Ruff (`ruff check .`)
- **Type Checker**: MyPy (`mypy .`)
- **Line Length**: 100 characters
- **Import Sorting**: Ruff (isort compatible)

```bash
# Run all checks
ruff check . && ruff format . && mypy .
```

### TypeScript/React (Frontend)

- **Formatter**: Prettier (`npm run format`)
- **Linter**: ESLint (`npm run lint`)
- **Type Checker**: TypeScript (`npm run typecheck`)

```bash
# Run all checks
npm run lint && npm run typecheck && npm run format
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance
- `perf`: Performance
- `security`: Security fix

Examples:
```
feat(inference): add temporal stabilization for video
fix(api): handle corrupted video uploads
docs(readme): update deployment instructions
```

## Pull Request Process

### Before Submitting

1. **Create feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Write tests** for new functionality

3. **Run all checks**:
   ```bash
   # Backend
   cd backend && ruff check . && ruff format . && mypy . && pytest tests/
   
   # Frontend
   cd frontend && npm run lint && npm run typecheck && npm run test
   ```

4. **Update documentation** if needed

### PR Requirements

- [ ] All checks pass
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Screenshots for UI changes
- [ ] Meaningful commit messages
- [ ] Single logical change per PR

### PR Template

```markdown
## Description
Brief description of changes

## Type
- [ ] Feature
- [ ] Bug Fix
- [ ] Documentation
- [ ] Refactor
- [ ] Performance
- [ ] Security

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing done

## Screenshots (UI changes)
<!-- Add screenshots here -->

## Breaking Changes
<!-- List any breaking changes -->

## Checklist
- [ ] Code follows style guides
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added
```

## Review Process

1. **Automated checks** must pass (CI)
2. **Code review** by at least 1 maintainer
3. **Address feedback** promptly
4. **Squash and merge** after approval

## Testing

### Backend Tests

```bash
cd backend

# All tests
pytest tests/ -v --cov

# Specific test file
pytest tests/test_inference.py -v

# With coverage
pytest tests/ --cov=backend --cov-report=html
```

### Frontend Tests

```bash
cd frontend

# Unit tests
npm run test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage
npm run test -- --coverage
```

### Test Guidelines

- **Unit tests**: Test individual functions/classes
- **Integration tests**: Test API endpoints, services
- **E2E tests**: Test critical user flows
- **Coverage target**: >80% for new code

## Project Structure

### Adding New Features

1. **Backend**: Add to appropriate service/module
   ```
   backend/
   ├── services/        # Business logic
   ├── api/v1/          # API endpoints
   ├── models/          # Pydantic models
   └── schemas/         # Request/Response schemas
   ```

2. **Frontend**: Use feature-based structure
   ```
   frontend/
   ├── features/        # Feature modules
   │   └── your-feature/
   │       ├── components/
   │       ├── hooks/
   │       ├── types/
   │       └── api.ts
   ```

### Adding New API Endpoints

1. Create schema in `backend/schemas/`
2. Add route in `backend/api/v1/`
3. Implement service logic in `backend/services/`
4. Add tests
5. Update API documentation

### Adding New UI Components

1. Create in `frontend/components/ui/` (reusable) or `frontend/features/`
2. Add Storybook story (if applicable)
3. Add tests
4. Export from index

## Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Refactoring
- `test/description` - Tests
- `chore/description` - Maintenance

## Release Process

1. **Version bump** (maintainers):
   ```bash
   # Update version in pyproject.toml, package.json
   # Update CHANGELOG.md
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions** builds and publishes Docker images

3. **Render** auto-deploys on tag push

## Getting Help

- **Questions**: GitHub Discussions
- **Bugs**: GitHub Issues
- **Security**: security@arabic-sign-language.ai
- **General**: GitHub Issues

## Recognition

Contributors are recognized in:
- GitHub Contributors page
- Release notes
- README acknowledgments

Thank you for contributing! 🎉