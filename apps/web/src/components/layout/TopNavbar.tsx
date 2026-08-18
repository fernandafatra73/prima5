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
  | { readonly type: 'group'; readonly groupId: string; readonly label: string; readonly icon: IconComponent; readonly items: readonly MenuItem[] };

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
