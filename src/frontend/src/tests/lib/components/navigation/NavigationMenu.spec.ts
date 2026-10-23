import NavigationMenu from '$lib/components/navigation/NavigationMenu.svelte';
import {
	NAVIGATION_ITEM_REWARDS,
	NAVIGATION_ITEM_SETTINGS,
	NAVIGATION_ITEM_TOKENS,
	NAVIGATION_MORE_MENU_BUTTON,
	SIDEBAR_NAVIGATION_MENU_BOTTOM,
	SIDEBAR_NAVIGATION_MENU_SCROLL
} from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	beforeNavigate: vi.fn(),
	afterNavigate: vi.fn()
}));

// Stands in for the dApp card the layout passes into the lower slot.
const lowerSlot = createRawSnippet(() => ({
	render: () => '<div data-tid="lower-slot">card</div>'
}));

describe('NavigationMenu', () => {
	const renderSidebar = () => {
		const result = render(NavigationMenu, { props: { children: lowerSlot } });

		return {
			...result,
			scroll: result.getByTestId(SIDEBAR_NAVIGATION_MENU_SCROLL),
			bottom: result.getByTestId(SIDEBAR_NAVIGATION_MENU_BOTTOM)
		};
	};

	it('pins Settings and the More menu outside the scrolling area', () => {
		// The point of the split. Settings and More used to sit in the page footer,
		// which is `position: fixed` and ignores this column, so in a short window
		// it landed on top of the sections here. In a block of their own, beneath
		// the part that scrolls, they cannot overlap anything.
		const { scroll, bottom } = renderSidebar();

		for (const testId of [NAVIGATION_ITEM_SETTINGS, NAVIGATION_MORE_MENU_BUTTON]) {
			const item = bottom.querySelector(`[data-tid="${testId}"]`);

			expect(item).not.toBeNull();
			expect(scroll.contains(item)).toBeFalsy();
		}
	});

	it('keeps the sections and the lower slot inside the scrolling area', () => {
		// So they are what gives way when the window is short.
		const { scroll, bottom } = renderSidebar();

		for (const selector of [
			`[data-tid="${NAVIGATION_ITEM_TOKENS}"]`,
			`[data-tid="${NAVIGATION_ITEM_REWARDS}"]`,
			'[data-tid="lower-slot"]'
		]) {
			expect(scroll.querySelector(selector)).not.toBeNull();
			expect(bottom.querySelector(selector)).toBeNull();
		}
	});

	it('places the pinned block after the scrolling area', () => {
		// DOM order is visual order in this flex column.
		const { scroll, bottom } = renderSidebar();

		expect(scroll.compareDocumentPosition(bottom) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('lets the scrolling area shrink, rather than push the pinned block out', () => {
		// Without `min-h-0` a flex child will not shrink below its content, and the
		// sections would push Settings and More off the bottom of the column
		// instead of scrolling. Asserted on the classes because jsdom has no layout.
		const { scroll, bottom } = renderSidebar();

		expect(scroll.classList.contains('min-h-0')).toBeTruthy();
		expect(scroll.classList.contains('flex-1')).toBeTruthy();
		expect(scroll.classList.contains('overflow-auto')).toBeTruthy();
		expect(bottom.classList.contains('shrink-0')).toBeTruthy();
	});
});
