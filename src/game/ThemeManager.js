export const THEMES = [
    {
        id: 'default',
        name: 'Cosmic Blue',
        emoji: '🌌',
        colors: {
            primary: '#06b6d4',       // cyan-500
            primaryBg: 'bg-cyan-600',
            primaryHover: 'hover:bg-cyan-500',
            primaryShadow: 'shadow-[0_0_15px_rgba(6,182,212,0.4)]',
            primaryBorder: 'border-cyan-400/30',
            accent: '#8b5cf6',        // violet
            headerText: 'text-cyan-400',
            bg: '#0f172a',            // slate-950
        }
    },
    {
        id: 'neon_green',
        name: 'Toxic Sloth',
        emoji: '☢️',
        colors: {
            primary: '#22c55e',
            primaryBg: 'bg-green-600',
            primaryHover: 'hover:bg-green-500',
            primaryShadow: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]',
            primaryBorder: 'border-green-400/30',
            accent: '#f59e0b',
            headerText: 'text-green-400',
            bg: '#0a1a0a',
        }
    },
    {
        id: 'crimson',
        name: 'Blood Moon',
        emoji: '🩸',
        colors: {
            primary: '#ef4444',
            primaryBg: 'bg-red-600',
            primaryHover: 'hover:bg-red-500',
            primaryShadow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]',
            primaryBorder: 'border-red-400/30',
            accent: '#f97316',
            headerText: 'text-red-400',
            bg: '#1a0000',
        }
    },
    {
        id: 'gold',
        name: 'Golden Age',
        emoji: '✨',
        colors: {
            primary: '#f59e0b',
            primaryBg: 'bg-amber-500',
            primaryHover: 'hover:bg-amber-400',
            primaryShadow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]',
            primaryBorder: 'border-amber-400/30',
            accent: '#8b5cf6',
            headerText: 'text-amber-400',
            bg: '#1a1000',
        }
    },
    {
        id: 'void',
        name: 'Void Walker',
        emoji: '🕳️',
        colors: {
            primary: '#a855f7',
            primaryBg: 'bg-purple-600',
            primaryHover: 'hover:bg-purple-500',
            primaryShadow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]',
            primaryBorder: 'border-purple-400/30',
            accent: '#ec4899',
            headerText: 'text-purple-400',
            bg: '#0d0014',
        }
    },
    {
        id: 'ice',
        name: 'Cryo Core',
        emoji: '❄️',
        colors: {
            primary: '#38bdf8',
            primaryBg: 'bg-sky-500',
            primaryHover: 'hover:bg-sky-400',
            primaryShadow: 'shadow-[0_0_15px_rgba(56,189,248,0.4)]',
            primaryBorder: 'border-sky-300/30',
            accent: '#e0f2fe',
            headerText: 'text-sky-300',
            bg: '#00101a',
        }
    },
];

const STORAGE_KEY = 'cosmic_sloth_theme';

export const ThemeManager = {
    getTheme() {
        const saved = localStorage.getItem(STORAGE_KEY);
        return THEMES.find(t => t.id === saved) || THEMES[0];
    },
    setTheme(themeId) {
        localStorage.setItem(STORAGE_KEY, themeId);
        window.dispatchEvent(new CustomEvent('themechange', { detail: themeId }));
    },
    getCurrentId() {
        return localStorage.getItem(STORAGE_KEY) || 'default';
    }
};