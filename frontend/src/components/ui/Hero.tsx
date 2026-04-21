import { ArrowDown, Smartphone, Globe, Package } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 px-4 py-24 text-white">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse-fast" />
          Free &amp; Open Source WebView Generator
        </div>

        <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Turn Any Website Into
          <br />
          <span className="text-blue-300">an Android App</span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg text-blue-100">
          Enter a URL, customize your app, and download a production-ready APK in minutes.
          No Android Studio required.
        </p>

        <div className="mb-12 flex flex-wrap justify-center gap-8 text-sm text-blue-200">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-300" />
            Any HTTPS website
          </div>
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-blue-300" />
            Android 5.0+
          </div>
          <div className="flex items-center gap-2">
            <Package size={16} className="text-blue-300" />
            APK or AAB
          </div>
        </div>

        <a
          href="#builder"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 font-semibold text-brand-700 shadow-lg hover:bg-blue-50 transition-colors"
        >
          Start Building <ArrowDown size={16} />
        </a>
      </div>
    </section>
  );
}
