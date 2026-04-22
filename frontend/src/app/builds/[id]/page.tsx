import { BuildStatus } from '@/components/build/BuildStatus';
import { Navbar } from '@/components/ui/Navbar';

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <BuildStatus buildId={id} />
      </main>
    </div>
  );
}
