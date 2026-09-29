import { Wrench } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, ErrorBox, Input } from '../components/ui';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700">
            <Wrench className="h-6 w-6 text-white" />
          </span>
          <div>
            <h1 className="text-lg font-bold">FixMate Admin</h1>
            <p className="text-sm text-slate-500">Sign in to the console</p>
          </div>
        </div>
        <div className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          {error ? <ErrorBox message={error} /> : null}
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </div>
        {import.meta.env.DEV ? <p className="mt-6 text-center text-xs text-slate-400">Dev account: see backend/prisma/seed.ts</p> : null}
      </form>
    </div>
  );
}
