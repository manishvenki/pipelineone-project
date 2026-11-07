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
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="h-20 border-b border-slate-800/80 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-40 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">
            Pipeline<span className="text-blue-500">One</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#integrations" className="hover:text-white transition-colors">Integrations</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02]"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 lg:px-12 text-center max-w-5xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-medium animate-pulse">
          <Zap className="w-3.5 h-3.5 text-blue-400" /> Phase 1: Real GitHub Sync & Static Project Engine
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
          From Repository to Deployment.{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Simplified.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Pipeline One is a modern, lightweight DevOps automation platform designed primarily for static websites. 
          Connect your GitHub account or upload ZIP archives with instant framework detection and enterprise-grade security.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            Start Free Now <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium rounded-2xl border border-slate-800 flex items-center justify-center gap-2 transition-all"
          >
            Access Dashboard
          </Link>
        </div>

        {/* Hero Preview Card */}
        <div className="mt-12 p-3 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/40 border border-slate-800 shadow-2xl backdrop-blur-xl max-w-4xl mx-auto text-left">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span>pipeline-one --live-inspection</span>
            <span>v1.0.0</span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="text-slate-400 font-sans font-semibold">1. Connect Source</div>
              <p className="text-slate-300">GitHub OAuth & PAT or Drag & Drop ZIP archives</p>
              <div className="text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated & Encrypted
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="text-slate-400 font-sans font-semibold">2. Static Detection</div>
              <p className="text-slate-300">Vite, React, Vanilla HTML/CSS, Astro, Next.js</p>
              <div className="text-blue-400 text-[11px] flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> Zero-Config Heuristics
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="text-slate-400 font-sans font-semibold">3. Ready for CI/CD</div>
              <p className="text-slate-300">Persisted in PostgreSQL with branch tracking</p>
              <div className="text-purple-400 text-[11px] flex items-center gap-1">
                <Database className="w-3.5 h-3.5" /> Ready for Automation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Overview */}
      <section id="features" className="py-20 px-6 lg:px-12 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="text-center space-y-3 mb-16">
          <Badge variant="primary">Platform Features</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Built for High-Velocity Frontend Engineering</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Everything you need to link your code repositories, analyze build structures, and manage static projects with zero friction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Github className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Real GitHub Integration</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect via OAuth authorization or Personal Access Token with AES-256-GCM encryption. Browse public and private repositories, branches, and commit histories.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileArchive className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Secure ZIP Upload</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drag-and-drop standalone static projects up to 50MB. Built with anti-ZipSlip path traversal checks and decompressed bomb limiters.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Automatic Project Detection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant classification of Vite, React, Pure HTML/CSS, and Astro frameworks with suggested build commands and output directory mapping.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">PostgreSQL & Atlas Hybrid</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Relational PostgreSQL tables with foreign keys and cascade rules for core data; secondary MongoDB Atlas document store for flexible AST scans.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Security-First Vault</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bcrypt password hashing, JWT with HttpOnly cookies, HMAC state validation, and strict input validation via Zod schemas.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Boxes className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Extensible Integrations</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Engineered for modular expansion. Ready for Docker Hub, Jenkins, and Vercel pipeline connections in forthcoming phases.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 lg:px-12 max-w-5xl mx-auto border-t border-slate-800/80">
        <div className="text-center space-y-3 mb-16">
          <Badge variant="violet">Workflow</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Three Steps to Setup</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Get your static website connected and tracked in under two minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 font-bold text-lg flex items-center justify-center mx-auto border border-blue-500/30">
              1
            </div>
            <h4 className="text-base font-semibold text-white">Register & Link Account</h4>
            <p className="text-xs text-slate-400">
              Create your account and authorize GitHub access with least-privilege scopes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-lg flex items-center justify-center mx-auto border border-indigo-500/30">
              2
            </div>
            <h4 className="text-base font-semibold text-white">Select Repo or ZIP</h4>
            <p className="text-xs text-slate-400">
              Choose an authorized GitHub repository or drag and drop a ZIP project archive.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 text-purple-400 font-bold text-lg flex items-center justify-center mx-auto border border-purple-500/30">
              3
            </div>
            <h4 className="text-base font-semibold text-white">Auto-Detection & Ready</h4>
            <p className="text-xs text-slate-400">
              Inspect project manifests, build scripts, and output paths ready for CI/CD.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#070A12] py-12 px-6 lg:px-12 text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-semibold text-white">Pipeline One</span>
            <span>• DevOps Automation Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-300">Sign In</Link>
            <Link to="/register" className="hover:text-slate-300">Register</Link>
            <a href="/api/health" target="_blank" rel="noreferrer" className="hover:text-slate-300 flex items-center gap-1">
              System Health <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            &copy; {new Date().getFullYear()} Pipeline One. Built for Phase 1.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

