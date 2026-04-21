import { Navbar } from '@/components/ui/Navbar';
import { Hero } from '@/components/ui/Hero';
import { BuildForm } from '@/components/form/BuildForm';
import { BuildHistory } from '@/components/build/BuildHistory';
import { HowItWorks } from '@/components/ui/HowItWorks';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <section id="builder" className="py-16 px-4">
          <div className="mx-auto max-w-3xl">
            <BuildForm />
          </div>
        </section>
        <HowItWorks />
        <section className="py-16 px-4 bg-white">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Recent Builds</h2>
            <BuildHistory />
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        APKMaker &copy; {new Date().getFullYear()} — Convert websites to Android apps
      </footer>
    </div>
  );
}
