import Header from '$lib/components/hero/Header.svelte';
import { mockAuthSignedIn } from '$tests/mocks/auth.mock';
import { fireEvent, render } from '@testing-library/svelte';

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
});
