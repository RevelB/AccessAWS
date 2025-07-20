
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
// Amplify error handling - no Firebase types needed
import { StaticAppLogo } from '@/components/StaticAppLogo';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { login, resendVerificationEmail } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleResendVerification = async () => {
    setIsResending(true);
    setError(null);
    try {
      await resendVerificationEmail(email, password);
      toast({
        title: 'Verification Email Sent',
        description: 'A new verification link has been sent to your email address.',
      });
      setShowResendVerification(false);
    } catch (err) {
      const error = err as any;
      setError(error.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResendVerification(false);

    if (!email.toLowerCase().endsWith('@extremereach.com')) {
      setError('Access is restricted to @extremereach.com email addresses.');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard/open');
    } catch (err) {
      const error = err as any;
      if (error.code === 'NotAuthorizedException' || error.name === 'NotAuthorizedException') {
        setError('Invalid email or password. Please try again.');
      } else if (error.code === 'UserNotConfirmedException' || error.name === 'UserNotConfirmedException') {
        setError('Your email has not been verified. Please check your inbox for a verification link.');
        setShowResendVerification(true);
      } else {
        setError(error.message || 'Failed to log in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4"
         style={{
           backgroundImage: 'url(/LoginBackground.jpg)',
           backgroundSize: 'cover',
           backgroundPosition: 'center' }}>
       <div className="absolute top-8 left-8 bg-white p-3 rounded-lg shadow-md">
        <StaticAppLogo />
      </div>
      <div className="absolute top-8 right-8 bg-white p-3 rounded-lg shadow-md">
        <Image src="/XRLogo.png" alt="XR Logo" width={138} height={50} />
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Login to AccessFlow</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@extremereach.com"
                required
                disabled={isLoading || isResending}
                className="text-base"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading || isResending}
                className="text-base"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="flex items-center text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertTriangle className="mr-2 h-4 w-4" />
                <div className="flex-1">{error}</div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading || isResending}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Log In
              </Button>
              {showResendVerification && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleResendVerification}
                  disabled={isResending}
                >
                  {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Resend Verification Email
                </Button>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <p className="text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
