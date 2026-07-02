import type { NavigationBarSlot, NavigationSection } from '$lib/types/navigation';

// Desktop sidebar information architecture: every section is always visible
// under its heading (headings render from PR 2 on).
export const DESKTOP_NAVIGATION_SECTIONS: NavigationSection[] = [
	{ id: 'portfolio', items: ['assets', 'nfts', 'activity'] },
	{ id: 'finance', items: ['trade', 'earn', 'borrow'] },
	{ id: 'more', items: ['explore', 'notes', 'settings', 'rewards'] }
];

// Mobile bottom-bar information architecture: five slots, two of which are
// groups that open bottom sheets (the cradle + sheets render from PR 3 on).
// Notes earns a top-level slot here while NFTs lives in the More sheet — the
// grouping is intentionally different from desktop (limited bar slots).
export const MOBILE_NAVIGATION_BAR: NavigationBarSlot[] = [
	{ type: 'item', id: 'assets' },
	{ type: 'item', id: 'activity' },
	{ type: 'group', id: 'finance', items: ['trade', 'earn', 'borrow'] },
	{ type: 'item', id: 'notes' },
	{ type: 'group', id: 'more', items: ['nfts', 'explore', 'settings', 'rewards'] }
];
