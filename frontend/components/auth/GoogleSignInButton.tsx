'use client';

import { useEffect, useId, useState } from 'react';
import { InfoCard } from '@/components/ui';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | boolean | number>) => void;
        };
      };
    };
  }
}

type Props = {
  onCredential: (credential: string) => void;
  disabled?: boolean;
  label?: string;
};

const scriptId = 'google-identity-services';

export default function GoogleSignInButton({ onCredential, disabled, label = 'Google দিয়ে চালু করুন' }: Props) {
  const id = useId().replace(/:/g, '');
  const [ready, setReady] = useState(false);
  const missingConfig = !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const init = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential && !disabled) onCredential(response.credential);
        },
      });
      const target = document.getElementById(id);
      if (target) {
        target.innerHTML = '';
        window.google.accounts.id.renderButton(target, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
        });
      }
      queueMicrotask(() => setReady(true));
    };

    if (window.google) {
      init();
      return;
    }

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', init);
    return () => script?.removeEventListener('load', init);
  }, [disabled, id, onCredential]);

  if (missingConfig) {
    return <InfoCard type="warning" message="Google login চালু করতে NEXT_PUBLIC_GOOGLE_CLIENT_ID সেট করুন।" />;
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''} aria-label={label}>
      <div id={id} className="flex min-h-11 justify-center" />
      {!ready && <div className="btn btn-outline btn-full pointer-events-none">{label}</div>}
    </div>
  );
}
