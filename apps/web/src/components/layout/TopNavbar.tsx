import { useEffect, useRef, useState, type JSX } from 'react';
import logoLabprima from '@src/image/logo-labprima.png';
import {
  isViewAllowed,
  MAIN_NAV_CATEGORIES,
  type AppViewId,
  type Departemen,
  type StaffRole,
} from '../../config/navigation.ts';
import {
  IconClipboard,
  IconCurrency,
  IconDocument,
  IconLogout,
  IconSettings,
  IconShare,
  IconShield,
  IconStethoscope,
  IconTag,
} from '../icons/NavIcons.tsx';
import './layout.css';

interface TopNavbarProps {
  readonly activeId: AppViewId;
  readonly onNavigate: (id: AppViewId) => void;
  readonly role: StaffRole;
  readonly departemen: Departemen | null;
  readonly onLogout: () => void;
}

type IconComponent = (props: { className?: string }) => JSX.Element;

interface MenuItem {
  readonly id: AppViewId;
  readonly label: string;
}

const PENGATURAN_ITEMS: readonly MenuItem[] = [
  { id: 'logo-perusahaan', label: 'Pengaturan Kop Surat & Logo' },
  { id: 'autote1', label: 'Autote1' },
  { id: 'foto-dashboard', label: 'Foto untuk Dashboard' },
];

interface ExternalLinkItem {
  readonly id: string;
  readonly label: string;
  readonly url: string;
}

const SOSMED_ITEMS: readonly ExternalLinkItem[] = [
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/' },
  { id: 'snackvideo', label: 'SnackVideo', url: 'https://www.snackvideo.com/' },
  { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/' },
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/' },
  { id: 'shopee', label: 'Shopee', url: 'https://shopee.co.id/' },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/' },
];

const MEGA_DATA_ITEMS: readonly MenuItem[] = [
  { id: 'fatra', label: 'Fatra' },
  { id: 'musik-ph', label: 'Musik-PH' },
  { id: 'templet', label: 'Templet' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'daftar-telpon', label: 'Daftar Telpon' },
  { id: 'kalender', label: 'Kalender' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'kalkulator', label: 'Kalkulator' },
  { id: 'ai-gemini', label: 'AI Gemini' },
];

type NavbarSpec =
  | { readonly type: 'link'; readonly id: AppViewId; readonly label: string; readonly icon: IconComponent }
  | { readonly type: 'category'; readonly categoryId: string; readonly icon: IconComponent }
  | { readonly type: 'group'; readonly groupId: string; readonly label: string; readonly icon: IconComponent; readonly items: readonly MenuItem[] }
  | { readonly type: 'external-group'; readonly groupId: string; readonly label: string; readonly icon: IconComponent; readonly items: readonly ExternalLinkItem[] };

const DROPDOWN_TINT_CLASS: Readonly<Record<string, string>> = {
  radiologi: 'app-navbar__dropdown--radiologi',
  laboratorium: 'app-navbar__dropdown--laboratorium',
  keuangan: 'app-navbar__dropdown--keuangan',
};

const NAVBAR_SPECS: readonly NavbarSpec[] = [
  { type: 'category', categoryId: 'pendaftaran', icon: IconClipboard },
  { type: 'category', categoryId: 'radiologi', icon: IconStethoscope },
  { type: 'category', categoryId: 'laboratorium', icon: IconTag },
  { type: 'category', categoryId: 'perhitungan-pajak', icon: IconCurrency },
  { type: 'category', categoryId: 'keuangan', icon: IconCurrency },
  { type: 'category', categoryId: 'master-sistem', icon: IconShield },
  { type: 'group', groupId: 'pengaturan', label: 'Pengaturan', icon: IconSettings, items: PENGATURAN_ITEMS },
  { type: 'category', categoryId: 'farmasi', icon: IconDocument },
  { type: 'group', groupId: 'mega-data', label: 'Mega Data', icon: IconTag, items: MEGA_DATA_ITEMS },
  { type: 'category', categoryId: 'anatomi', icon: IconStethoscope },
  { type: 'link', id: 'ai-radiologi', label: 'AI Radiologi', icon: IconStethoscope },
  { type: 'link', id: 'hak-akses', label: 'Hak Akses', icon: IconShield },
  { type: 'external-group', groupId: 'sosmed', label: 'Sosmed', icon: IconShare, items: SOSMED_ITEMS },
];

export function TopNavbar({ activeId, onNavigate, role, departemen, onLogout }: TopNavbarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function handlePointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openMenuId]);

  return (
    <header className="app-navbar">
      <div className="app-navbar__brand">
        <div className="app-navbar__logo">
          <img src={logoLabprima} alt="Klinik Prima Husada" className="app-navbar__logo-img" />
        </div>
        <div className="app-navbar__brand-text">
          <span className="app-navbar__title">Klinik Prima Husada</span>
          <span className="app-navbar__subtitle">Sistem Informasi Klinik Prima Husada</span>
        </div>
      </div>

      <nav className="app-navbar__nav" ref={navRef} aria-label="Navigasi utama">
        {NAVBAR_SPECS.map((spec) => {
          if (spec.type === 'link') {
            if (!isViewAllowed(spec.id, role, departemen)) return null;
            const Icon = spec.icon;
            const isActive = activeId === spec.id;
            return (
              <button
                key={spec.id}
                type="button"
                className={`app-navbar__link ${isActive ? 'app-navbar__link--active' : ''}`}
                onClick={() => {
                  onNavigate(spec.id);
                  setOpenMenuId(null);
                }}
              >
                <Icon className="app-navbar__link-icon" />
                <span>{spec.label}</span>
              </button>
            );
          }

          if (spec.type === 'external-group') {
            const Icon = spec.icon;
            const isOpen = openMenuId === spec.groupId;
            return (
              <div key={spec.groupId} className="app-navbar__category">
                <button
                  type="button"
                  className={`app-navbar__link ${isOpen ? 'app-navbar__link--open' : ''}`}
                  onClick={() => setOpenMenuId(isOpen ? null : spec.groupId)}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                >
                  <Icon className="app-navbar__link-icon" />
                  <span>{spec.label}</span>
                  <span className="app-navbar__caret" aria-hidden>
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <ul className="app-navbar__dropdown" role="menu">
                    {spec.items.map((item) => (
                      <li key={item.id} role="none">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          role="menuitem"
                          className="app-navbar__dropdown-link"
                          onClick={() => setOpenMenuId(null)}
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }

          const menu: { readonly key: string; readonly label: string; readonly items: readonly MenuItem[] } | null =
            spec.type === 'category'
              ? (() => {
                  const cat = MAIN_NAV_CATEGORIES.find((c) => c.id === spec.categoryId);
                  return cat
                    ? { key: cat.id, label: cat.label, items: cat.items.map((item) => ({ id: item.id as AppViewId, label: item.shortLabel ?? item.label })) }
                    : null;
                })()
              : { key: spec.groupId, label: spec.label, items: spec.items };

          if (!menu) return null;
          const visibleItems = menu.items.filter((item) => isViewAllowed(item.id, role, departemen));
          if (visibleItems.length === 0) return null;

          const Icon = spec.icon;
          const hasActiveChild = visibleItems.some((item) => item.id === activeId);
          const isOpen = openMenuId === menu.key;

          return (
            <div key={menu.key} className="app-navbar__category">
              <button
                type="button"
                className={`app-navbar__link ${hasActiveChild ? 'app-navbar__link--active' : ''} ${isOpen ? 'app-navbar__link--open' : ''}`}
                onClick={() => setOpenMenuId(isOpen ? null : menu.key)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
              >
                <Icon className="app-navbar__link-icon" />
                <span>{menu.label}</span>
                <span className="app-navbar__caret" aria-hidden>
                  ▾
                </span>
              </button>

              {isOpen && (
                <ul
                  className={`app-navbar__dropdown ${DROPDOWN_TINT_CLASS[menu.key] ?? ''}`}
                  role="menu"
                >
                  {visibleItems.map((item) => (
                    <li key={item.id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className={`app-navbar__dropdown-link ${activeId === item.id ? 'app-navbar__dropdown-link--active' : ''}`}
                        onClick={() => {
                          onNavigate(item.id);
                          setOpenMenuId(null);
                        }}
                      >
                        {item.label}
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
        <div className="app-navbar__user">
          <span className="app-navbar__user-credit">By: F. Fatria Fatra</span>
          <div className="app-navbar__avatar" aria-hidden>
            FF
          </div>
        </div>

        <button type="button" className="app-navbar__icon-btn" aria-label="Logout" onClick={onLogout}>
          <IconLogout />
        </button>
      </div>
    </header>
  );
}
