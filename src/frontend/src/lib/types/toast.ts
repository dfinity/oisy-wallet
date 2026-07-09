import type { Component } from 'svelte';

export type ToastLevel = 'success' | 'warn' | 'error' | 'info' | 'custom';
export type ToastPosition = 'bottom' | 'top';
export type ToastTheme = 'themed' | 'inverted';

// Full toast message shape (vendored from gix), including the store-assigned `id`.
export interface ToastMsgUI {
	id: symbol;
	title?: string;
	text: string;
	level: ToastLevel;
	spinner?: boolean;
	duration?: number;
	position?: ToastPosition;
	overflow?: 'scroll' | 'truncate' | 'clamp';
	icon?: Component;
	theme?: ToastTheme;
	renderAsHtml?: boolean;
	// Temporarily render this toast above overlays (modals / bottom sheets) — for a
	// confirmation triggered from within a bottom sheet, where the default toast
	// tiers sit behind it (e.g. copying a share link). Workaround until such
	// confirmations have inline feedback.
	overlay?: boolean;
}

// The shape callers pass to `toastsShow` / `toastsError` — the store assigns the `id`.
export type ToastMsg = Omit<ToastMsgUI, 'id'>;
