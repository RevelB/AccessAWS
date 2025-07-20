
'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState } from 'react';
import { client } from '@/lib/amplify';
import { getUserPrefs, saveInitials } from '@/lib/userPrefs';
import { useToast } from '@/hooks/use-toast';

export default function UserProfilePage() {
  const { user, loading } = useAuth();
  const [initials, setInitials] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [initialsError, setInitialsError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const fetchUserPrefs = async () => {
        try {
          const userPrefs = await getUserPrefs(user.userId);
          if (userPrefs?.initials) {
            setInitials(userPrefs.initials);
          }
        } catch (error) {
          // User preferences don't exist yet, that's okay
          console.log('No user preferences found');
        }
      };
      fetchUserPrefs();
    }
  }, [user]);

  const handleInitialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (value.length <= 3) {
      setInitials(value);
      if (initialsError) {
        setInitialsError(null);
      }
    }
  };

  const handleSaveInitials = async () => {
    if (!user) return;

    if (!/^[A-Z]{2,3}$/.test(initials)) {
      setInitialsError('Initials must be 2 or 3 uppercase letters.');
      return;
    }
    setInitialsError(null);
    setIsSaving(true);

    try {
      await saveInitials(user.userId, initials);
      toast({
        title: 'Success',
        description: 'Your initials have been saved.',
      });
    } catch (error) {
      console.error("Error saving initials:", error);
      toast({
        title: 'Error',
        description: 'Failed to save initials. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading user profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Could not load user profile. Please try logging in again.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getProviderName = (providerId: string) => {
    switch (providerId) {
      case 'password':
        return 'Email & Password';
      case 'google.com':
        return 'Google';
      case 'phone':
        return 'Phone';
      default:
        return providerId;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">User Profile</CardTitle>
          <CardDescription>View and manage your account details below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={user.username || 'No email provided'}
              readOnly
              className="cursor-default"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initials">Your Initials</Label>
            <div className="flex items-start gap-2">
              <div className="flex-grow">
                <Input
                  id="initials"
                  name="initials"
                  type="text"
                  value={initials}
                  onChange={handleInitialsChange}
                  placeholder="e.g., JD or JDO"
                  maxLength={3}
                  disabled={isSaving}
                  className="w-full"
                />
                {initialsError && (
                  <p className="mt-1 text-sm text-destructive">{initialsError}</p>
                )}
              </div>
              <Button onClick={handleSaveInitials} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Enter your 2 or 3-letter initials for job tracking.</p>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" id="auth-method-label">Authentication Method</div>
             <div className="flex flex-wrap gap-2" role="group" aria-labelledby="auth-method-label">
              <Badge variant="secondary" className="text-sm">
                Email & Password
              </Badge>
            </div>
          </div>
           <div className="space-y-2">
            <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" id="email-verification-label">Email Verification Status</div>
              <Badge variant="default" className="text-sm">
                Verified
              </Badge>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-3 border-t p-6">
          <h3 className="text-base font-semibold">About this Application</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">About AccessFlow</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>AccessFlow Application</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <p>Created by Michael Lee</p>
                <p>July 2025</p>
                <p>Version 1.0</p>
              </div>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
