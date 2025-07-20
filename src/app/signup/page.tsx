
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
// Amplify error handling - no Firebase types needed
import { StaticAppLogo } from '@/components/StaticAppLogo'; // Changed from AppLogo
import Image from 'next/image';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);



    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await signup(email, password);
      setSuccess("Account created! Please check your inbox for a verification email before logging in.");
      // Redirect to login page after showing the message
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      const error = err as any;
      if (error.code === 'UsernameExistsException' || error.name === 'UsernameExistsException') {
        setError('This email is already registered. Please log in or use a different email.');
      } else if (error.code === 'InvalidPasswordException' || error.name === 'InvalidPasswordException') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(error.message || 'Failed to create account. Please try again.');
      }
      console.error(err);
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
          <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join AccessFlow to manage your jobs efficiently.</CardDescription>
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
                placeholder="you@example.com"
                required
                disabled={isLoading}
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
                placeholder="•••••••• (min. 6 characters)"
                required
                disabled={isLoading}
                className="text-base"
                autoComplete="new-password"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="text-base"
                autoComplete="new-password"
              />
            </div>
            {error && (
              <div className="flex items-center text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertTriangle className="mr-2 h-4 w-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center text-sm text-green-600 bg-green-500/10 p-3 rounded-md">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {success}
              </div>
            )}
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading || !!success}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign Up
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
