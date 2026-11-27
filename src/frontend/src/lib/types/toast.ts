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
	// A "Learn more" style link after the text, like the app's other links to its docs.
	link?: { href: string; label: string };
}

// The shape callers pass to `toastsShow` / `toastsError` — the store assigns the `id`.
export type ToastMsg = Omit<ToastMsgUI, 'id'>;
