import { ReactNode } from 'react';
import { useAnalyticsTracking } from '@/hooks/useAnalyticsTracking';

const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
  useAnalyticsTracking();
  return <>{children}</>;
};

export default AnalyticsProvider;
