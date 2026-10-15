import Header from '$lib/components/hero/Header.svelte';
import {
	NAVIGATION_MENU_BUTTON,
	NETWORKS_SWITCHER_DROPDOWN
} from '$lib/constants/test-ids.constants';
import { mockAuthSignedIn } from '$tests/mocks/auth.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('Header', () => {
	const header = (container: HTMLElement): HTMLElement | null => container.querySelector('header');

	it('sticks to the top from 768 px when signed in, and is fixed from 1408 px as before', () => {
		mockAuthSignedIn();

		const { container } = render(Header);

		expect(header(container)).toHaveClass('md:sticky', 'md:top-0', 'md:z-10', '1.5xl:fixed');
	});

	it('scrolls away with the page when signed out', () => {
		mockAuthSignedIn(false);

		const { container } = render(Header);

		expect(header(container)).not.toHaveClass('md:sticky');
		expect(header(container)).not.toHaveClass('1.5xl:fixed');
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

	it('keeps its view-transition name while the network switcher is open, which navigates before it closes', async () => {
		mockAuthSignedIn();

		const { container, getAllByTestId } = render(Header);

		await fireEvent.click(getAllByTestId(NETWORKS_SWITCHER_DROPDOWN)[0]);

		// Raised above the banners: the header knows one of its popovers is open.
		expect(header(container)).toHaveClass('z-20');
		expect(header(container)?.style.viewTransitionName).toBe('header');
	});
});
