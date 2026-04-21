import Link from 'next/link';
import { Smartphone } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Smartphone size={16} />
          </span>
          <span>APKMaker</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <a href="#builder" className="text-slate-600 hover:text-slate-900 transition-colors">
            Build
          </a>
          <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors">
            How It Works
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !py-1.5"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
