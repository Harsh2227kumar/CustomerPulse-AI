import { Navigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole | AppRole[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, hasRole, hasAnyRole, roles } = useAuth();
  const toastShown = useRef(false);

  const hasAccess = !requiredRole
    ? true
    : Array.isArray(requiredRole)
      ? hasAnyRole(...requiredRole)
      : hasRole(requiredRole);

  useEffect(() => {
    if (!loading && user && !hasAccess && !toastShown.current && roles.length > 0) {
      toastShown.current = true;
      toast.error('You do not have permission to access this page');
    }
  }, [loading, user, hasAccess, roles.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!hasAccess && roles.length > 0) return <Navigate to="/" replace />;

  return <>{children}</>;
}
