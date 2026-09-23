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

		it('carries Settings under the id both e2e page objects navigate by', () => {
			// `settings.page.ts` and `homepage.page.ts` reach Settings by exactly
			// `navigation-item-settings`. The first version of this change rendered
			// the footer with a `footer-` test-id prefix, which would have left no
			// element on desktop answering to that id — and e2e was skipped on the
			// PR, so nothing would have said so.
			const { getByTestId } = render(Footer);

			expect(getByTestId(NAVIGATION_ITEM_SETTINGS)).toBeInTheDocument();
		});

		it('offers the More menu', () => {
			const { getByTestId } = render(Footer);

			expect(getByTestId(NAVIGATION_MORE_MENU_BUTTON)).toBeInTheDocument();
		});

		it('no longer shows the social icons, which moved into that menu', () => {
			// The menu is closed here, so its X and Source code rows are not in the
			// document either: any link to these URLs would be a leftover icon.
			const { container } = render(Footer);

			expect(hrefs(container)).not.toContain(OISY_TWITTER_URL);
			expect(hrefs(container)).not.toContain(OISY_REPO_URL);
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
		});

		it('offers no Settings and no More menu to someone who cannot open the app', () => {
			// `<Footer />` renders outside `<AuthGuard>`, so this is the landing page.
			const { queryByTestId } = render(Footer);

			expect(queryByTestId(NAVIGATION_ITEM_SETTINGS)).toBeNull();
			expect(queryByTestId(NAVIGATION_MORE_MENU_BUTTON)).toBeNull();
		});
	});
});
