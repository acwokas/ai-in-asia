import { ReactNode, useEffect } from 'react';
import { useAnalyticsTracking, setupGlobalErrorTracking } from '@/hooks/useAnalyticsTracking';

// Setup global error tracking once on app load
let errorTrackingInitialized = false;

const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
  useAnalyticsTracking();

  useEffect(() => {
    if (!errorTrackingInitialized) {
      setupGlobalErrorTracking();
      errorTrackingInitialized = true;
    }
  }, []);

  return <>{children}</>;
};

export default AnalyticsProvider;
