'use client';

import { Button, Input, Card, CardBody } from '@bloomstock/ui';
import { useEffect, useState } from 'react';
import { apiPost } from '@/lib/api';
import { hasAuthRedirectPayload, messageFromAuthRedirect } from '@/lib/auth-redirect';
import { completeAuthFromLocation } from '@/lib/complete-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    if (!hasAuthRedirectPayload(search, hash)) return;
    const fromRedirect = messageFromAuthRedirect(search, hash);
    if (fromRedirect) {
      setMessage(fromRedirect);
      window.history.replaceState(null, '', '/login');
      return;
    }
    setCompleting(true);
    setMessage('Signing you in…');
    void (async () => {
      const result = await completeAuthFromLocation(search, hash);
      if (result.ok) {
        window.location.replace(result.next);
        return;
      }
      setCompleting(false);
      setMessage(result.message);
      window.history.replaceState(null, '', '/login');
    })();
  }, []);

  async function sendLink() {
    setPending(true);
    setMessage('');
    try {
      const result = await apiPost<{ message: string; signedIn?: boolean }>('/api/auth/magic-link', {
        email,
      });
      if (result.signedIn) {
        window.location.assign('/dashboard');
        return;
      }
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send magic link.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4 py-8">
          <p className="font-serif text-4xl">
            Bloom<span className="text-[#d4a017]">Stock</span>
          </p>
          <p className="text-sm text-zinc-400">Institutional desk access. Magic link only.</p>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="work email"
          />
          <Button variant="gold" onClick={sendLink} disabled={pending || completing} className="w-full">
            {completing ? 'Signing you in…' : pending ? 'Sending…' : 'Send link'}
          </Button>
          {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}
