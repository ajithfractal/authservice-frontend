import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { GitBranch, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/services/AuthContext';
import { getPostLoginPath } from '@/utils/postLoginRedirect';
import { navigateAfterAuthCommit } from '@/utils/navigateAfterAuth';
import type { SsoProvider } from '@/services/AuthService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

function ProviderIcon({ providerKey }: { providerKey: string }) {
  const key = providerKey.toLowerCase();
  if (key === 'microsoft') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <rect x="2" y="2" width="9" height="9" fill="#F25022" />
        <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
        <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
        <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
      </svg>
    );
  }
  if (key === 'google') return <Mail className="h-4 w-4 text-red-500" />;
  if (key === 'github') return <GitBranch className="h-4 w-4" />;
  return <ShieldCheck className="h-4 w-4" />;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login, listSsoProviders, loading, error, user, initializing } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [ssoReturnError, setSsoReturnError] = useState<string | null>(null);

  const returnTo = (location.state as { from?: string } | undefined)?.from;
  const oauthError = (location.state as { oauthError?: string } | undefined)?.oauthError ?? null;

  useEffect(() => {
    const q = searchParams.get('error');
    if (!q) return;
    setSsoReturnError(q === 'code_already_used' ? 'This sign-in link was already used. Please try again.' : q);
    const next = new URLSearchParams(searchParams);
    next.delete('error');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (initializing || !user) return;
    const destination =
      returnTo && returnTo !== '/login' ? returnTo : getPostLoginPath(user);
    navigateAfterAuthCommit(navigate, destination);
  }, [initializing, user, navigate, returnTo]);

  useEffect(() => {
    const load = async () => {
      setProvidersLoading(true);
      setProvidersError(null);
      try {
        const list = await listSsoProviders();
        setProviders(list);
      } catch (err) {
        setProvidersError(err instanceof Error ? err.message : 'Unable to load SSO providers');
      } finally {
        setProvidersLoading(false);
      }
    };

    void load();
  }, [listSsoProviders]);

  const sortedProviders = useMemo(
    () => [...providers].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [providers]
  );

  if (initializing) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Checking your session…
        </div>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const currentUser = await login(email, password);
      const destination =
        returnTo && returnTo !== '/login' ? returnTo : getPostLoginPath(currentUser);
      navigateAfterAuthCommit(navigate, destination);
    } catch {
      // error handled in context
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in with your company account or SSO provider.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>

          {(error || oauthError || ssoReturnError || providersError) && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error ?? oauthError ?? ssoReturnError ?? providersError}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Or continue with</span>
              <Separator className="flex-1" />
            </div>

            {providersLoading ? (
              <Button variant="outline" className="w-full" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading providers...
              </Button>
            ) : sortedProviders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No SSO providers are enabled.</p>
            ) : (
              <div className="space-y-2">
                {sortedProviders.map((provider) => (
                  <Button
                    key={provider.key}
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => window.location.assign(provider.loginUrl)}
                  >
                    <ProviderIcon providerKey={provider.key} />
                    Continue with {provider.displayName}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
