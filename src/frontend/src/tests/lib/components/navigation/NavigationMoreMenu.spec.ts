import { goto } from '$app/navigation';
import NavigationMoreMenu from '$lib/components/navigation/NavigationMoreMenu.svelte';
import {
	OISY_DOCS_URL,
	OISY_FAQ_URL,
	OISY_REPO_URL,
	OISY_SUPPORT_URL,
	OISY_TWITTER_URL
} from '$lib/constants/oisy.constants';
import { AppPath } from '$lib/constants/routes.constants';
import {
	NAVIGATION_MORE_MENU,
	NAVIGATION_MORE_MENU_BUTTON,
	NAVIGATION_MORE_MENU_DOCUMENTATION,
	NAVIGATION_MORE_MENU_FAQ,
	NAVIGATION_MORE_MENU_HELP,
	NAVIGATION_MORE_MENU_SOURCE_CODE,
	NAVIGATION_MORE_MENU_X
} from '$lib/constants/test-ids.constants';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

const featureFlags = vi.hoisted(() => ({ helpEnabled: true }));

vi.mock('$env/help.env', () => ({
	get HELP_ENABLED() {
		return featureFlags.helpEnabled;
	}
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

// The rows that leave the app whatever the Help page's flag says.
const EXTERNAL_ROWS = [
	NAVIGATION_MORE_MENU_DOCUMENTATION,
	NAVIGATION_MORE_MENU_FAQ,
	NAVIGATION_MORE_MENU_SOURCE_CODE,
	NAVIGATION_MORE_MENU_X
];

// The rows, in the order they must appear.
const ROWS = [
	NAVIGATION_MORE_MENU_HELP,
	NAVIGATION_MORE_MENU_DOCUMENTATION,
	NAVIGATION_MORE_MENU_FAQ,
	NAVIGATION_MORE_MENU_SOURCE_CODE,
	NAVIGATION_MORE_MENU_X
];

describe('NavigationMoreMenu', () => {
	beforeEach(() => {
		featureFlags.helpEnabled = true;
		vi.mocked(goto).mockReset();
	});

	const open = async () => {
		const result = render(NavigationMoreMenu);

		await fireEvent.click(result.getByTestId(NAVIGATION_MORE_MENU_BUTTON));
		await waitFor(() => expect(result.getByTestId(NAVIGATION_MORE_MENU)).toBeInTheDocument());

		return result;
	};

	it('starts closed', () => {
		const { getByTestId, queryByTestId } = render(NavigationMoreMenu);

		expect(queryByTestId(NAVIGATION_MORE_MENU)).toBeNull();
		expect(getByTestId(NAVIGATION_MORE_MENU_BUTTON).getAttribute('aria-expanded')).toBe('false');
	});

	it('opens on the trigger and says so to assistive tech', async () => {
		const { getByTestId } = await open();

		expect(getByTestId(NAVIGATION_MORE_MENU_BUTTON).getAttribute('aria-expanded')).toBe('true');
	});

	it('lists help first, then the links that leave the app', async () => {
		const { getByTestId } = await open();

		const rows = ROWS.map((testId) => getByTestId(testId));

		// Each row follows the one before it in the document.
		for (let i = 1; i < rows.length; i++) {
			expect(
				rows[i - 1].compareDocumentPosition(rows[i]) & Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
		}
	});

	it('points each row where it says it goes', async () => {
		const { getByTestId } = await open();

		expect(getByTestId(NAVIGATION_MORE_MENU_DOCUMENTATION).getAttribute('href')).toBe(
			OISY_DOCS_URL
		);
		expect(getByTestId(NAVIGATION_MORE_MENU_FAQ).getAttribute('href')).toBe(OISY_FAQ_URL);
		expect(getByTestId(NAVIGATION_MORE_MENU_SOURCE_CODE).getAttribute('href')).toBe(OISY_REPO_URL);
		expect(getByTestId(NAVIGATION_MORE_MENU_X).getAttribute('href')).toBe(OISY_TWITTER_URL);
	});

	it('opens every outbound row in a new tab, with noopener', async () => {
		// A same-tab link would take the whole wallet with it; without `noopener` the
		// opened page gets a `window.opener` handle.
		const { getByTestId } = await open();

		for (const testId of EXTERNAL_ROWS) {
			const row = getByTestId(testId);

			expect(row.getAttribute('target')).toBe('_blank');
			expect(row.getAttribute('rel')).toContain('noopener');
		}
	});

	describe('Help', () => {
		it('opens the in-app Help page where that page is enabled', async () => {
			// In this tab rather than a new one: it is part of the wallet, not a
			// place the reader is sent away to.
			const { getByTestId, queryByTestId } = await open();

			const help = getByTestId(NAVIGATION_MORE_MENU_HELP);

			expect(help.tagName).toBe('BUTTON');
			expect(help.getAttribute('target')).toBeNull();

			await fireEvent.click(help);

			await waitFor(() => expect(goto).toHaveBeenCalledOnce());

			expect(vi.mocked(goto).mock.calls[0][0]).toContain(AppPath.Help);
			expect(queryByTestId(NAVIGATION_MORE_MENU)).toBeNull();
		});

		it('keeps the documentation support page where the Help page is not enabled', async () => {
			// Production, until the page ships there. Same row, same label, same
			// place; only where it goes differs.
			featureFlags.helpEnabled = false;

			const { getByTestId } = await open();

			const help = getByTestId(NAVIGATION_MORE_MENU_HELP);

			expect(help.getAttribute('href')).toBe(OISY_SUPPORT_URL);
			expect(help.getAttribute('target')).toBe('_blank');
			expect(help.getAttribute('rel')).toContain('noopener');
		});
	});

	it('opens upward, since the footer is pinned to the bottom of the viewport', async () => {
		// Opened the usual way, below its anchor, the panel would have nowhere to go.
		const { container } = await open();

		expect(container.ownerDocument.querySelector('.popover .wrapper.above')).not.toBeNull();
	});

	it('renders the menu at the document root, outside whatever hosts the trigger', async () => {
		// The footer is `md:fixed` with `z-1`, a stacking context. Rendered inside
		// it, the overlay's z-index only competed with the footer's own children, so
		// the header, the tabs bar and the AI assistant button (`z-2`) drew on top
		// of the backdrop. Moved to the end of <body>, it stacks against the page.
		const { container, getByTestId } = await open();

		const menu = getByTestId(NAVIGATION_MORE_MENU);

		expect(container.contains(menu)).toBeFalsy();
		expect(document.body.contains(menu)).toBeTruthy();
	});

	it('takes the moved menu away with it when it unmounts', async () => {
		// Otherwise every mount would leave a detached copy at the end of <body>.
		const { getByTestId, unmount } = await open();

		const menu = getByTestId(NAVIGATION_MORE_MENU);

		unmount();

		expect(document.body.contains(menu)).toBeFalsy();
	});

	it('closes on Escape', async () => {
		// `Popover` has no key handling of its own, so this is the menu's.
		const { getByTestId, queryByTestId } = await open();

		await fireEvent.keyDown(window, { key: 'Escape' });

		await waitFor(() => expect(queryByTestId(NAVIGATION_MORE_MENU)).toBeNull());

		expect(getByTestId(NAVIGATION_MORE_MENU_BUTTON).getAttribute('aria-expanded')).toBe('false');
	});

	it('ignores other keys', async () => {
		const { getByTestId } = await open();

		await fireEvent.keyDown(window, { key: 'Enter' });

		expect(getByTestId(NAVIGATION_MORE_MENU)).toBeInTheDocument();
	});

	it('closes once a row is chosen', async () => {
		// The row opens in a new tab, so without this the menu would still be open
		// when the reader comes back to this one.
		const { getByTestId, queryByTestId } = await open();

		await fireEvent.click(getByTestId(NAVIGATION_MORE_MENU_HELP));

		await waitFor(() => expect(queryByTestId(NAVIGATION_MORE_MENU)).toBeNull());
	});
});
