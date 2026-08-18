import type { ReactNode } from 'react';
import type { AppViewId } from '../../config/navigation.ts';
import type { AuthUser } from '../../lib/auth.ts';
import { AutoTextBar } from './AutoTextBar.tsx';
import { TopNavbar } from './TopNavbar.tsx';
import './layout.css';

const CLINIC_MARQUEE_TEXT = 'Klinik Prima Husada — Jl. Siliwangi Ruko Palapa No 2 Parung Kuda. Telp 0857-1932-5557';

interface AppShellProps {
  readonly activeView: AppViewId;
  readonly authUser: AuthUser;
  readonly onNavigate: (id: AppViewId) => void;
  readonly onLogout: () => void;
  readonly children: ReactNode;
}

export function AppShell({ activeView, authUser, onNavigate, onLogout, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <TopNavbar
        activeId={activeView}
        onNavigate={onNavigate}
        role={authUser.role}
        departemen={authUser.departemen}
        onLogout={onLogout}
      />
      <main className="app-content">{children}</main>
      <AutoTextBar text={CLINIC_MARQUEE_TEXT} />
    </div>
  );
}
