import type { TagVariant } from '$lib/types/style';
import type { Component } from 'svelte';

export type NavigationItemId =
	| 'assets'
	| 'nfts'
	| 'activity'
	| 'trade'
	| 'borrow'
	| 'earn'
	| 'explore'
	| 'notes'
	| 'settings'
	| 'rewards'
	| 'x'
	| 'github';

export type NavigationGroupId = 'portfolio' | 'finance' | 'more';

// A desktop sidebar section: a non-interactive heading with its leaf items.
export interface NavigationSection {
	id: NavigationGroupId;
	items: NavigationItemId[];
}

// A mobile bottom-bar slot: either a single leaf item or a group that (from
// PR 3 on) opens a bottom sheet of its children.
export type NavigationBarSlot =
	| { type: 'item'; id: NavigationItemId }
	| { type: 'group'; id: NavigationGroupId; items: NavigationItemId[] };

// Render description for a single leaf item. Built reactively in the component
// so labels/selection follow the i18n store and the current route; an item id
// with no descriptor is simply not rendered yet (e.g. Trade/Borrow before PR 2).
export interface NavigationItemDescriptor {
	label: string;
	ariaLabel: string;
	testId: string;
	icon: Component;
	href?: string;
	// Opens in a new tab rather than routing. The social links are navigation
	// items that leave the app, and a bare `<a>` would take the SPA with them.
	external?: boolean;
	onclick?: () => void;
	selected: boolean;
	tag?: string;
	tagVariant?: TagVariant;
}
