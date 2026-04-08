'use client';
import { useEffect, useState, ReactNode } from 'react';
export default function HydrationBoundary({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);
  return isHydrated ? <>{children}</> : null;
}
