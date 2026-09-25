import Footer from '$lib/components/core/Footer.svelte';
import { OISY_REPO_URL, OISY_TWITTER_URL } from '$lib/constants/oisy.constants';
import {
	NAVIGATION_ITEM_SETTINGS,
	NAVIGATION_MORE_MENU_BUTTON
} from '$lib/constants/test-ids.constants';
import { mockAuthSignedIn } from '$tests/mocks/auth.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

const hrefs = (container: HTMLElement): (string | null)[] =>
	[...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));

describe('Footer', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockPage.reset();
	});

	describe('signed in', () => {
		beforeEach(() => {
			mockAuthSignedIn(true);
		});

		it('holds no navigation any more', () => {
			// Settings and the More menu moved out of here and into a block pinned to
			// the bottom of the sidebar. This footer is `position: fixed`, and in a
			// short window it landed on top of the sidebar's scrolling sections.
			const { queryByTestId } = render(Footer);

			expect(queryByTestId(NAVIGATION_ITEM_SETTINGS)).toBeNull();
			expect(queryByTestId(NAVIGATION_MORE_MENU_BUTTON)).toBeNull();
		});

		it('keeps the social icons below md only, where there is no More menu to hold them', () => {
			// The More menu lives in the desktop sidebar and the mobile More sheet does
			// not carry X or GitHub, so dropping these would leave a phone with neither.
			const { container } = render(Footer);

			const links = [...container.querySelectorAll('a')].filter((a) =>
				[OISY_TWITTER_URL, OISY_REPO_URL].includes(a.getAttribute('href') ?? '')
			);

			expect(links).toHaveLength(2);

			links.forEach((link) => expect(link.parentElement).toHaveClass('md:hidden'));
		});
	});

	describe('signed out', () => {
		beforeEach(() => {
			mockAuthSignedIn(false);
		});

		it('keeps the social icons, since the menu they moved into is signed-in only', () => {
			const { container } = render(Footer);

			expect(hrefs(container)).toContain(OISY_TWITTER_URL);
			expect(hrefs(container)).toContain(OISY_REPO_URL);
			expect(
				container.querySelector(`a[href="${OISY_TWITTER_URL}"]`)?.parentElement
			).not.toHaveClass('md:hidden');
		});

		it('offers no Settings and no More menu to someone who cannot open the app', () => {
			// `<Footer />` renders outside `<AuthGuard>`, so this is the landing page.
			const { queryByTestId } = render(Footer);

			expect(queryByTestId(NAVIGATION_ITEM_SETTINGS)).toBeNull();
			expect(queryByTestId(NAVIGATION_MORE_MENU_BUTTON)).toBeNull();
		});
	});
});
