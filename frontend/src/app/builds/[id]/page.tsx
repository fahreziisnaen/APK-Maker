import { BuildStatus } from '@/components/build/BuildStatus';
import { Navbar } from '@/components/ui/Navbar';

export default function BuildPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <BuildStatus buildId={params.id} />
      </main>
    </div>
  );
}
