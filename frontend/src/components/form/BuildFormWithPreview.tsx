'use client';
import { useState } from 'react';
import { BuildForm } from './BuildForm';
import { PhonePreview } from '@/components/ui/PhonePreview';

interface PreviewState {
  url: string;
  themeColor: string;
  appName: string;
  iconSrc?: string;
}

export function BuildFormWithPreview() {
  const [preview, setPreview] = useState<PreviewState>({
    url: '',
    themeColor: '#2563EB',
    appName: '',
  });

  return (
    <div className="flex gap-8 items-start">
      {/* Form — grows to fill available space */}
      <div className="flex-1 min-w-0">
        <BuildForm onPreviewChange={setPreview} />
      </div>

      {/* Phone preview — fixed width, hidden on small screens */}
      <div className="hidden xl:block flex-shrink-0 sticky top-8">
        <PhonePreview
          url={preview.url}
          themeColor={preview.themeColor}
          appName={preview.appName}
          iconSrc={preview.iconSrc}
        />
      </div>
    </div>
  );
}
