import React from 'react';

interface Props {
  children: React.ReactNode;
}

export default function ErrorBoundary({ children }: Props) {
  // Simple stub: just render children
  return <>{children}</>;
}
