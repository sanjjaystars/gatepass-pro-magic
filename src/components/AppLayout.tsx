import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { LogOut, Shield, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-card border-b border-border/50 rounded-none">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              GatePass <span className="text-gradient">Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              {role === 'admin' ? (
                <Shield className="h-4 w-4 text-primary" />
              ) : (
                <GraduationCap className="h-4 w-4 text-primary" />
              )}
              <span className="capitalize">{role}</span>
              <span className="text-border">|</span>
              <span className="truncate max-w-[150px]">{user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
