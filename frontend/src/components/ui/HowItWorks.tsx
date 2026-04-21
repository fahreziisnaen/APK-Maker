const steps = [
  {
    num: '01',
    title: 'Enter your URL',
    desc: 'Paste your website URL, fill in the app name and package identifier.',
  },
  {
    num: '02',
    title: 'Customize',
    desc: 'Upload an icon, splash screen, choose a theme color, and enable features.',
  },
  {
    num: '03',
    title: 'Build',
    desc: 'Our builder injects your config into an Android WebView template and runs Gradle.',
  },
  {
    num: '04',
    title: 'Download',
    desc: 'Get your APK or AAB file ready to sideload or publish to Google Play.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 bg-slate-50">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900">How It Works</h2>
          <p className="mt-3 text-slate-500">From URL to APK in four steps</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.num} className="card text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">
                {step.num}
              </div>
              <h3 className="mb-2 font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
