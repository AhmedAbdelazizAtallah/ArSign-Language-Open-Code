# FAQ

## General Questions

### What is this platform?
This is a production-ready web platform for real-time Arabic Sign Language recognition using a custom YOLO26s model exported to ONNX format. It supports live camera, video upload, and image upload with Arabic RTL sentence building.

### Who is this for?
- Deaf and Hard-of-Hearing users for communication
- Researchers studying Arabic Sign Language
- Universities and accessibility organizations
- Students learning Arabic Sign Language
- Developers building assistive technology

### What sign languages are supported?
Currently: **Arabic Sign Language (ArSL)** with 32 letter classes.
Future versions will support other sign languages and dialects.

### Is this open source?
Yes! Licensed under MIT. See [LICENSE](LICENSE).

### Can I use this commercially?
Yes, MIT license allows commercial use. Attribution appreciated.

---

## Technical Questions

### What model does it use?
- **Architecture**: YOLO26s (260 layers, ~10M parameters)
- **Format**: ONNX (best.onnx)
- **Input**: 640×640 RGB
- **Classes**: 32 Arabic Sign Language letters
- **Performance**: 98.59% mAP@50, 97.10% Precision, 95.52% Recall

### What hardware do I need?
**Minimum:**
- CPU: 2+ cores
- RAM: 4 GB
- Disk: 5 GB

**Recommended (GPU):**
- NVIDIA GPU with CUDA support (T4, A10G, RTX 3080+)
- 8+ GB VRAM
- 16 GB RAM

### Does it work on CPU only?
Yes! Automatic fallback to CPUExecutionProvider if CUDA not available. Performance: ~20 FPS on modern CPU vs 200+ FPS on GPU.

### What browsers are supported?
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 15+
- Mobile Chrome/Safari

### Is HTTPS required?
**Yes for camera access** (browser security policy). Use:
- `localhost` (works without HTTPS)
- ngrok for local testing: `ngrok http 3000`
- Proper SSL certificates for production

---

## Usage Questions

### How do I add my own model?
1. Export your model to ONNX format
2. Replace `models/best.onnx`
3. Update class names in `ai/config.py` if different
4. Restart the backend

### How do I adjust detection sensitivity?
Change in Settings page or `.env`:
```env
CONF_THRESHOLD=0.25  # Lower = more detections
IOU_THRESHOLD=0.5    # Overlap threshold
```

### Why are detections missing?
Common causes:
- Poor lighting (need good illumination)
- Hands too far/close (optimal: 0.5-2m)
- Complex background (use plain background)
- Motion blur (hold signs steady)
- Low confidence threshold needed

### Can I process multiple hands?
The model detects multiple hands in frame. Each hand is detected independently.

### How do I export data?
- **Sentence**: Settings → Export (JSON/TXT)
- **History**: History page → Export (JSON/CSV/TXT)
- **Video**: Video page → Download processed video
- **Image**: Image page → Download annotated image

---

## Deployment Questions

### Can I deploy to Render.com?
Yes! Use the provided `render.yaml`. Connect GitHub repo and deploy.

### Can I deploy to my own server?
Yes! Use Docker Compose:
```bash
docker-compose up -d --build
```

### Can I deploy to Kubernetes?
Yes! Helm chart structure provided in `k8s/` (see DEPLOYMENT.md).

### How do I enable GPU in Docker?
```yaml
# docker-compose.yml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```
Requires nvidia-container-toolkit on host.

### How do I set up SSL?
Use Nginx reverse proxy with Let's Encrypt:
```bash
sudo certbot --nginx -d your-domain.com
```
See DEPLOYMENT.md for full config.

---

## Troubleshooting

### "Model not loaded" error
```bash
# Check model file
ls -la models/best.onnx

# Validate
python -c "import onnx; onnx.checker.check_model(onnx.load('models/best.onnx'))"
```

### Camera shows black screen
- Check browser permissions
- Ensure HTTPS (or localhost)
- Try different camera index
- Check `navigator.mediaDevices.enumerateDevices()`

### Video upload fails
- Check file size (< 100MB)
- Check format (MP4, AVI, MOV, MKV)
- Check disk space: `df -h`

### High memory usage
```bash
# Limit container memory
docker-compose.yml:
  backend:
    deploy:
      resources:
        limits:
          memory: 4G
```

---

## Contributing

### How do I contribute?
1. Fork the repository
2. Create feature branch: `git checkout -b feat/amazing-feature`
3. Make changes with tests
4. Run linting: `ruff check . && npm run lint`
5. Submit PR

### What's the code style?
- Python: Ruff (Black-compatible), 100-char lines
- TypeScript: Prettier + ESLint, strict mode
- Commits: Conventional Commits

### Where do I report bugs?
GitHub Issues with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots/logs

---

## License & Legal

### Can I modify the model?
The model architecture (YOLO) is open, but your trained weights may have separate licensing. Check your training data licenses.

### Is patient data handled?
**No.** This platform processes only sign language gestures. No personal/medical data is collected or stored by default.

### GDPR/Privacy compliance?
- No personal data collected by default
- History stored locally (user's browser)
- No tracking/analytics
- Self-hosted = full data control

---

## Support

### Where can I get help?
- **GitHub Discussions**: Questions and ideas
- **GitHub Issues**: Bug reports
- **Email**: support@arabic-sign-language.ai
- **Documentation**: /docs folder

### Is there a community?
- GitHub Discussions
- Discord (link in README)
- Quarterly community calls

### Can I sponsor the project?
Yes! GitHub Sponsors or OpenCollective (links in README). Funds go to:
- GPU compute for training
- Accessibility research
- Community events
- Maintenance

---

## Roadmap

### v1.1 (Q2 2026)
- Sentence autocomplete
- Grammar correction
- Context awareness

### v1.2 (Q3 2026)
- Text-to-speech
- Multiple voices
- Offline TTS

### v1.3 (Q4 2026)
- User accounts
- Cloud sync
- Progress tracking

### v2.0 (2027)
- Word-level recognition
- Sentence translation
- Multi-hand tracking

### v3.0 (2027+)
- Cloud inference
- Auto-scaling
- Enterprise features

See [ROADMAP.md](ROADMAP.md) for details.