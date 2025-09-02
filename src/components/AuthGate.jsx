import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Spin } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function AuthGate() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const loc = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{ padding: 24 }}><Spin /></div>;
  if (!session && loc.pathname !== '/login') return <Navigate to="/login" replace />;
  return <Outlet />;
}
