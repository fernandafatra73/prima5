import type { ReactNode } from 'react';
import type { AppViewId } from '../../config/navigation.ts';
import type { AuthUser } from '../../lib/auth.ts';
import { TopNavbar } from './TopNavbar.tsx';
import './layout.css';

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
        authUser={authUser}
        onLogout={onLogout}
      />
      <main className="app-content">{children}</main>
    </div>
  );
}
