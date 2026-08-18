import { useEffect, useRef, useState, type JSX } from 'react';
import logoLabprima from '@src/image/logo-labprima.png';
import {
  DASHBOARD_NAV_ID,
  isViewAllowedForRole,
  MAIN_NAV_CATEGORIES,
  type AppViewId,
  type StaffRole,
} from '../../config/navigation.ts';
import { useMusicPlayer } from '../../context/MusicPlayerContext.tsx';
import type { AuthUser } from '../../lib/auth.ts';
import {
  IconBell,
  IconClipboard,
  IconCurrency,
  IconDashboard,
  IconDocument,
  IconLogout,
  IconMusic,
  IconSettings,
  IconShield,
  IconStethoscope,
  IconTag,
  IconUsers,
} from '../icons/NavIcons.tsx';
import './layout.css';

interface TopNavbarProps {
  readonly activeId: AppViewId;
  readonly onNavigate: (id: AppViewId) => void;
  readonly role: StaffRole;
  readonly authUser: AuthUser;
  readonly onLogout: () => void;
}

type IconComponent = (props: { className?: string }) => JSX.Element;

type NavbarSpec =
  | { readonly type: 'link'; readonly id: AppViewId; readonly label: string; readonly icon: IconComponent }
  | { readonly type: 'category'; readonly categoryId: string; readonly icon: IconComponent };

const NAVBAR_SPECS: readonly NavbarSpec[] = [
  { type: 'link', id: DASHBOARD_NAV_ID, label: 'Dashboard', icon: IconDashboard },
  { type: 'link', id: 'data-terbesar', label: 'Data Terbesar', icon: IconTag },
  { type: 'category', categoryId: 'pendaftaran', icon: IconClipboard },
  { type: 'category', categoryId: 'radiologi', icon: IconStethoscope },
  { type: 'category', categoryId: 'laboratorium', icon: IconTag },
  { type: 'category', categoryId: 'perhitungan-pajak', icon: IconCurrency },
  { type: 'category', categoryId: 'keuangan', icon: IconCurrency },
  { type: 'category', categoryId: 'master-sistem', icon: IconShield },
  { type: 'category', categoryId: 'farmasi', icon: IconDocument },
  { type: 'category', categoryId: 'anatomi', icon: IconStethoscope },
  { type: 'link', id: 'fatra', label: 'Fatra', icon: IconUsers },
  { type: 'link', id: 'musik-ph', label: 'Musik-PH', icon: IconMusic },
  { type: 'category', categoryId: 'templet', icon: IconDocument },
  { type: 'link', id: 'transfer', label: 'Transfer', icon: IconClipboard },
  { type: 'link', id: 'daftar-telpon', label: 'Daftar Telpon', icon: IconClipboard },
  { type: 'link', id: 'kalender', label: 'Kalender', icon: IconClipboard },
  { type: 'link', id: 'whatsapp', label: 'WhatsApp', icon: IconClipboard },
  { type: 'link', id: 'telegram', label: 'Telegram', icon: IconClipboard },
  { type: 'link', id: 'kalkulator', label: 'Kalkulator', icon: IconClipboard },
  { type: 'link', id: 'ai-gemini', label: 'AI Gemini', icon: IconClipboard },
  { type: 'link', id: 'ai-radiologi', label: 'AI Radiologi', icon: IconStethoscope },
  { type: 'link', id: 'ai-radiologi-grup', label: 'Data Master AI Radiologi', icon: IconTag },
];

function getRoleLabel(role: AuthUser['role']): string {
  return role === 'ADMIN' ? 'Manajemen' : 'Pekerja';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function TopNavbar({ activeId, onNavigate, role, authUser, onLogout }: TopNavbarProps) {
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const { playingId, playLoadingId, playlist, toggleQuickPlay } = useMusicPlayer();
  const isPlaying = playingId !== null;
  const isLoading = playLoadingId !== null;
  const playingSong = playlist.find((p) => p.id === playingId);
  const hasPlaylist = playlist.length > 0;
  const initials = getInitials(authUser.nama) || 'LP';

  useEffect(() => {
    if (!openCategoryId) return;
    function handlePointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenCategoryId(null);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openCategoryId]);

  return (
    <header className="app-navbar">
      <div className="app-navbar__brand">
        <div className="app-navbar__logo">
          <img src={logoLabprima} alt="Klinik Prima Husada" className="app-navbar__logo-img" />
        </div>
        <span className="app-navbar__title">Klinik Prima Husada</span>
      </div>

      <nav className="app-navbar__nav" ref={navRef} aria-label="Navigasi utama">
        {NAVBAR_SPECS.map((spec) => {
          if (spec.type === 'link') {
            if (!isViewAllowedForRole(spec.id, role)) return null;
            const Icon = spec.icon;
            const isActive = activeId === spec.id;
            return (
              <button
                key={spec.id}
                type="button"
                className={`app-navbar__link ${isActive ? 'app-navbar__link--active' : ''}`}
                onClick={() => {
                  onNavigate(spec.id);
                  setOpenCategoryId(null);
                }}
              >
                <Icon className="app-navbar__link-icon" />
                <span>{spec.label}</span>
              </button>
            );
          }

          const cat = MAIN_NAV_CATEGORIES.find((c) => c.id === spec.categoryId);
          if (!cat) return null;
          const visibleItems = cat.items.filter((item) => isViewAllowedForRole(item.id as AppViewId, role));
          if (visibleItems.length === 0) return null;

          const Icon = spec.icon;
          const hasActiveChild = visibleItems.some((item) => item.id === activeId);
          const isOpen = openCategoryId === cat.id;

          return (
            <div key={cat.id} className="app-navbar__category">
              <button
                type="button"
                className={`app-navbar__link ${hasActiveChild ? 'app-navbar__link--active' : ''} ${isOpen ? 'app-navbar__link--open' : ''}`}
                onClick={() => setOpenCategoryId(isOpen ? null : cat.id)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
              >
                <Icon className="app-navbar__link-icon" />
                <span>{cat.label}</span>
                <span className="app-navbar__caret" aria-hidden>
                  ▾
                </span>
              </button>

              {isOpen && (
                <ul className="app-navbar__dropdown" role="menu">
                  {visibleItems.map((item) => (
                    <li key={item.id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className={`app-navbar__dropdown-link ${activeId === item.id ? 'app-navbar__dropdown-link--active' : ''}`}
                        onClick={() => {
                          onNavigate(item.id as AppViewId);
                          setOpenCategoryId(null);
                        }}
                      >
                        {item.shortLabel ?? item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="app-navbar__actions">
        <button type="button" className="app-navbar__icon-btn" aria-label="Notifikasi">
          <IconBell />
        </button>

        <button
          type="button"
          className="app-navbar__icon-btn"
          aria-pressed={isPlaying}
          aria-label={isPlaying ? `Hentikan musik: ${playingSong?.judul ?? ''}` : 'Putar musik'}
          title={
            isLoading
              ? 'Memuat lagu…'
              : isPlaying
                ? `Hentikan musik: ${playingSong?.judul ?? ''}`
                : hasPlaylist
                  ? 'Putar musik dari Daftar Lagu'
                  : 'Belum ada lagu di Daftar Lagu (Musik-PH)'
          }
          onClick={toggleQuickPlay}
          disabled={isLoading || (!isPlaying && !hasPlaylist)}
          style={isPlaying ? { color: 'var(--color-primary)' } : undefined}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸️' : '▶️'}
        </button>

        <button type="button" className="app-navbar__icon-btn" aria-label="Pengaturan">
          <IconSettings />
        </button>

        <div className="app-navbar__user">
          <div className="app-navbar__user-text">
            <p className="app-navbar__user-name">{authUser.nama}</p>
            <p className="app-navbar__user-role">{getRoleLabel(authUser.role)}</p>
          </div>
          <div className="app-navbar__avatar" aria-hidden>
            {initials}
          </div>
        </div>

        <button type="button" className="app-navbar__icon-btn" aria-label="Logout" onClick={onLogout}>
          <IconLogout />
        </button>
      </div>
    </header>
  );
}
