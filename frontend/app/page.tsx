'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Video, 
  Camera, 
  Image, 
  Zap, 
  Shield, 
  Languages, 
  Accessibility,
  ArrowRight,
  Github,
  Twitter,
  Heart
} from 'lucide-react';

const features = [
  {
    icon: Camera,
    title: 'Live Camera',
    description: 'Real-time sign language detection from your webcam with 200+ FPS',
    href: '/camera',
  },
  {
    icon: Video,
    title: 'Video Processing',
    description: 'Upload and analyze videos with frame-by-frame detection and export',
    href: '/video',
  },
  {
    icon: Image,
    title: 'Image Recognition',
    description: 'Instant detection on uploaded images with bounding boxes and confidence',
    href: '/image',
  },
];

const stats = [
  { value: '98.59%', label: 'mAP@50' },
  { value: '82.15%', label: 'mAP@50-95' },
  { value: '97.10%', label: 'Precision' },
  { value: '95.52%', label: 'Recall' },
];

const highlights = [
  { icon: Zap, title: 'Real-time Performance', desc: 'Sub-10ms end-to-end latency with GPU acceleration' },
  { icon: Shield, title: 'Privacy First', desc: 'All processing happens locally - no data leaves your device' },
  { icon: Languages, title: 'Arabic RTL Support', desc: 'Native right-to-left text rendering for Arabic sentences' },
  { icon: Accessibility, title: 'Accessibility', desc: 'WCAG 2.1 AA compliant with screen reader support' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-background dark:from-primary-950/20 dark:to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/50 via-transparent to-transparent dark:from-primary-900/20" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
              </span>
              Version 1.0.0 • Production Ready
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6"
            >
              Arabic Sign Language{' '}
              <span className="text-primary-600 dark:text-primary-400">Recognition</span>
              <br />
              <span className="text-muted-foreground font-normal">Powered by AI</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              Real-time Arabic Sign Language recognition from camera, video, and images.
              Built with YOLO26s + ONNX Runtime for production-grade performance.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/camera"
                className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary-600 text-white font-semibold text-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25"
              >
                <Camera className="h-5 w-5" />
                Try Live Camera
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/image"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-border bg-background text-foreground font-semibold text-lg hover:bg-surface-hover transition-colors"
              >
                <Image className="h-5 w-5" />
                Upload Image
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.3 }}
                className="text-center p-4 rounded-xl bg-surface-elevated border border-border"
              >
                <div className="text-3xl sm:text-4xl font-bold text-primary-600 dark:text-primary-400">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Three Ways to Recognize
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the input method that fits your needs - all powered by the same
              high-accuracy YOLO26s model
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
                className="group relative p-6 rounded-2xl bg-surface-elevated border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground mb-6">{feature.description}</p>
                  
                  <Link
                    href={feature.href}
                    className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium hover:underline group-hover:underline"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 sm:py-28 bg-surface-elevated border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Built for Production
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade architecture with accessibility, security, and scalability at its core
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((highlight, i) => (
              <motion.div
                key={highlight.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
                className="p-6 rounded-xl bg-background border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4">
                  <highlight.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{highlight.title}</h3>
                <p className="text-muted-foreground">{highlight.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Modern Tech Stack
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 max-w-4xl mx-auto">
            const techStack = [
              { name: 'Next.js 15', icon: '⚛️', color: 'text-gray-600 dark:text-gray-400' },
              { name: 'React 19', icon: '⚛️', color: 'text-blue-500' },
              { name: 'TypeScript', icon: '📘', color: 'text-blue-600' },
              { name: 'Tailwind v4', icon: '🎨', color: 'text-cyan-500' },
              { name: 'FastAPI', icon: '⚡', color: 'text-green-500' },
              { name: 'ONNX Runtime', icon: '🧠', color: 'text-orange-500' },
              { name: 'Python 3.14', icon: '🐍', color: 'text-yellow-500' },
            ];
            
            {techStack.map((tech, i) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                className="p-4 rounded-xl bg-surface-elevated border border-border text-center"
              >
                <span className="text-3xl mb-2 block">{tech.icon}</span>
                <span className={`font-medium ${tech.color}`}>{tech.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 bg-primary-600 dark:bg-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-primary-100 mb-8">
              Clone the repository, add your model, and start recognizing Arabic Sign Language in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://github.com/your-org/arabic-sign-language-platform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-primary-600 font-semibold hover:bg-primary-50 transition-colors"
              >
                <Github className="h-5 w-5" />
                View on GitHub
              </Link>
              <Link
                href="/camera"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-white text-white font-semibold hover:bg-white/10 transition-colors"
              >
                <Camera className="h-5 w-5" />
                Try Live Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-surface-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4 text-red-500" />
              <span>Built with care for the Deaf and Hard-of-Hearing community</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
              <a href="#" className="hover:text-foreground transition-colors">API Reference</a>
              <a href="#" className="hover:text-foreground transition-colors">Community</a>
              <a href="#" className="hover:text-foreground transition-colors">Contribute</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Arabic Sign Language Platform. MIT License.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}