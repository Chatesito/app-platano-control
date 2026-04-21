'use client';

import HeaderPrecio from './HeaderPrecio';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeaderPrecio />
      {children}
    </>
  );
}