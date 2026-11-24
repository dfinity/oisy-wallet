import Header from '$lib/components/hero/Header.svelte';
import {
	ABOUT_WHY_OISY_BUTTON,
	NAVIGATION_MENU_BUTTON,
	NETWORKS_SWITCHER_DROPDOWN
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { mockAuthSignedIn } from '$tests/mocks/auth.mock';
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('Header', () => {
	const header = (container: HTMLElement): HTMLElement | null => container.querySelector('header');
	const sectionNavLabel = get(i18n).auth.landing.sections_label;

	it('sticks to the top from 768 px when signed in, and is fixed from 1408 px as before', () => {
		mockAuthSignedIn();

		const { container, queryByRole } = render(Header, { showLandingNavigation: true });

		expect(header(container)).toHaveClass('md:sticky', 'md:top-0', 'md:z-10', '1.5xl:fixed');
		expect(queryByRole('navigation', { name: sectionNavLabel })).not.toBeInTheDocument();
	});

	it('scrolls away with the page when signed out', () => {
		mockAuthSignedIn(false);

		const { container, queryByRole } = render(Header);

		expect(header(container)).not.toHaveClass('md:sticky');
		expect(header(container)).not.toHaveClass('1.5xl:fixed');
		expect(queryByRole('navigation', { name: sectionNavLabel })).not.toBeInTheDocument();
	});

	it('offers Why OISY next to the docs link when signed out', () => {
		mockAuthSignedIn(false);

		const { getByTestId } = render(Header, { showLandingNavigation: true });

		expect(getByTestId(ABOUT_WHY_OISY_BUTTON)).toBeInTheDocument();
	});

	it('links to wallet features when the signed-out landing page is shown', () => {
		mockAuthSignedIn(false);

		const { getByRole } = render(Header, { showLandingNavigation: true });
		const nav = getByRole('navigation', { name: sectionNavLabel });
		const { auth, navigation, swap } = get(i18n);
		const { borrow_eyebrow, security_eyebrow } = auth.landing;

		// Wide screens only: below lg the landing's floating section menu carries these links.
		expect(nav).toHaveClass('hidden', 'lg:flex');

		for (const [name, href] of [
			[navigation.text.tokens, '#landing-hold'],
			[security_eyebrow, '#landing-security'],
			[swap.text.swap, '#landing-swap'],
			[borrow_eyebrow, '#landing-borrow']
		]) {
			expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', href);
		}
	});

	it('marks itself scrolled once the page scrolls, and not at the top', async () => {
		mockAuthSignedIn();

		const { container } = render(Header);

		expect(header(container)).not.toHaveClass('scrolled');

		window.scrollY = 120;
		await fireEvent.scroll(window);

		expect(header(container)).toHaveClass('scrolled');

		window.scrollY = 0;
		await fireEvent.scroll(window);

		expect(header(container)).not.toHaveClass('scrolled');
	});

	it('drops its view-transition name while the user menu is open, so the backdrop can blur the page', async () => {
		mockAuthSignedIn();

		const { container, getAllByTestId } = render(Header);

		expect(header(container)?.style.viewTransitionName).toBe('header');

		await fireEvent.click(getAllByTestId(NAVIGATION_MENU_BUTTON)[0]);

		expect(header(container)?.style.viewTransitionName).toBe('none');

		await fireEvent.click(container.querySelector('[data-tid="backdrop"]') as HTMLElement);

		await waitFor(() => expect(header(container)?.style.viewTransitionName).toBe('header'));
	});

	it('keeps its view-transition name while the network switcher is open, whose backdrop is invisible', async () => {
		mockAuthSignedIn();

		const { container, getAllByTestId } = render(Header);

		await fireEvent.click(getAllByTestId(NETWORKS_SWITCHER_DROPDOWN)[0]);

		// Raised above the banners: the header knows one of its popovers is open.
		expect(header(container)).toHaveClass('z-20');
		expect(header(container)?.style.viewTransitionName).toBe('header');
	});
});
