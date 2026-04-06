import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import StudentDashboard from '@/pages/StudentDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import Auth from '@/pages/Auth';

const Index = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Auth />;

  if (role === 'admin') return <AdminDashboard />;

  return <StudentDashboard />;
};

export default Index;
