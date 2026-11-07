import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Github,
  FileArchive,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Zap,
  Boxes,
  Database,
  ExternalLink,
} from 'lucide-react';
import Badge from '../components/common/Badge';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="h-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md sticky top-0 z-40 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">
            Pipeline<span className="text-blue-600">One</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600 font-medium">
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
          <a href="#architecture" className="hover:text-blue-600 transition-colors">Architecture</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors font-medium"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:scale-[1.02]"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 lg:px-12 text-center max-w-5xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 text-blue-600" /> Enterprise Static Website CI/CD Platform
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
          From Repository to Deployment.{' '}
          <span className="text-blue-600">
            Simplified.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Pipeline One is a modern, lightweight DevOps automation platform designed for static websites. 
          Connect your GitHub account or upload ZIP archives with instant framework detection and seamless Vercel edge deployment.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            Start Free Now <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-medium rounded-2xl border border-slate-200 flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            Access Dashboard
          </Link>
        </div>

        {/* Hero Preview Card */}
        <div className="mt-12 p-3 rounded-2xl bg-white border border-slate-200 shadow-md max-w-4xl mx-auto text-left">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <span>pipeline-one --arctic-edition</span>
            <span className="text-blue-600 font-semibold">Production Ready</span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-slate-900 font-sans font-semibold">1. Connect Source</div>
              <p className="text-slate-600">GitHub OAuth & PAT or Drag & Drop ZIP archives</p>
              <div className="text-emerald-700 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Authenticated & Encrypted
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-slate-900 font-sans font-semibold">2. Static Detection</div>
              <p className="text-slate-600">Vite, React, Vanilla HTML/CSS, Astro, Next.js</p>
              <div className="text-blue-700 text-[11px] flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-blue-600" /> Zero-Config Heuristics
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-slate-900 font-sans font-semibold">3. Vercel Git Delivery</div>
              <p className="text-slate-600">Direct Git integration to edge CDN domains</p>
              <div className="text-blue-700 text-[11px] flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-blue-600" /> Genuine Live Source
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Overview */}
      <section id="features" className="py-20 px-6 lg:px-12 max-w-6xl mx-auto border-t border-slate-200">
        <div className="text-center space-y-3 mb-16">
          <Badge variant="primary">Platform Features</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Built for High-Velocity Frontend Engineering</h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto">
            Everything you need to link your code repositories, analyze build structures, and manage static projects with zero friction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Github className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Real GitHub Integration</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect via OAuth authorization or Personal Access Token with AES-256-GCM encryption. Browse public and private repositories, branches, and commit histories.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FileArchive className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Secure ZIP Upload</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Drag-and-drop standalone static projects up to 50MB. Built with anti-ZipSlip path traversal checks and decompressed bomb limiters.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Automatic Project Detection</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instant classification of Vite, React, Pure HTML/CSS, and Astro frameworks with suggested build commands and output directory mapping.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">PostgreSQL & Atlas Hybrid</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Relational PostgreSQL tables with foreign keys and cascade rules for core data; secondary MongoDB Atlas document store for flexible AST scans.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Security-First Vault</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bcrypt password hashing, JWT with HttpOnly cookies, HMAC state validation, and strict input validation via Zod schemas.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Boxes className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Extensible Integrations</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Engineered for modular expansion. Complete with Docker Hub, Jenkins, and Vercel pipeline connections in active production.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 lg:px-12 max-w-5xl mx-auto border-t border-slate-200">
        <div className="text-center space-y-3 mb-16">
          <Badge variant="primary">Workflow</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Three Steps to Setup</h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Get your static website connected and tracked in under two minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 font-bold text-lg flex items-center justify-center mx-auto border border-blue-200">
              1
            </div>
            <h4 className="text-base font-semibold text-slate-900">Register & Link Account</h4>
            <p className="text-xs text-slate-600">
              Create your account and authorize GitHub access with least-privilege scopes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 font-bold text-lg flex items-center justify-center mx-auto border border-blue-200">
              2
            </div>
            <h4 className="text-base font-semibold text-slate-900">Select Repo or ZIP</h4>
            <p className="text-xs text-slate-600">
              Choose an authorized GitHub repository or drag and drop a ZIP project archive.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 font-bold text-lg flex items-center justify-center mx-auto border border-blue-200">
              3
            </div>
            <h4 className="text-base font-semibold text-slate-900">Auto-Detection & Ready</h4>
            <p className="text-xs text-slate-600">
              Inspect project manifests, build scripts, and output paths ready for CI/CD.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-12 px-6 lg:px-12 text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-900">Pipeline One</span>
            <span>• DevOps Automation Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-slate-900 transition-colors">Register</Link>
            <a href="/api/health" target="_blank" rel="noreferrer" className="hover:text-slate-900 flex items-center gap-1 transition-colors">
              System Health <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            &copy; {new Date().getFullYear()} Pipeline One. Arctic Professional Edition.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
