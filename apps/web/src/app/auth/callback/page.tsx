'use client';

import { Card, CardBody } from '@bloomstock/ui';
import { useEffect, useState } from 'react';
import { completeAuthFromLocation } from '@/lib/complete-auth';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await completeAuthFromLocation(window.location.search, window.location.hash);
      if (cancelled) return;
      if (result.ok) {
        window.location.replace(result.next);
        return;
      }
      const login = new URL('/login', window.location.origin);
      login.searchParams.set('error_description', result.message);
      window.location.replace(login.toString());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4 py-8">
          <p className="font-serif text-4xl">
            Bloom<span className="text-[#d4a017]">Stock</span>
          </p>
          <p className="text-sm text-zinc-400">{message}</p>
        </CardBody>
      </Card>
    </div>
  );
}
