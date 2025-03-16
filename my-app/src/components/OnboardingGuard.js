import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import LoadingScreen from './LoadingScreen';

const OnboardingGuard = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const currentPath = window.location.pathname;

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, selected_exam_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        setIsOnboardingComplete(Boolean(data?.name && data?.selected_exam_id));
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsOnboardingComplete(false);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, currentPath]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isOnboardingComplete && currentPath === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isOnboardingComplete && currentPath !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default OnboardingGuard;