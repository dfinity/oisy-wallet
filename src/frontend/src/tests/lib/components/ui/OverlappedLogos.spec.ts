import OverlappedLogos from '$lib/components/ui/OverlappedLogos.svelte';
import { render } from '@testing-library/svelte';

describe('OverlappedLogos.svelte', () => {
	const mockIcons = ['/icon1.svg', '/icon2.svg', '/icon3.svg'];

	const getIconWrappers = (container: HTMLElement) =>
		container.querySelectorAll<HTMLElement>('[style*="z-index"]');

	it('renders a Logo for each icon', () => {
		const { container } = render(OverlappedLogos, { props: { icons: mockIcons } });

		const images = container.querySelectorAll('img');

		expect(images).toHaveLength(mockIcons.length);
	});

	it('renders nothing when icons array is empty', () => {
		const { container } = render(OverlappedLogos, { props: { icons: [] } });

		const images = container.querySelectorAll('img');

		expect(images).toHaveLength(0);

		// No loading skeleton: an empty list is "no icons", not "loading".
		const skeleton = container.querySelector('.w-12');

		expect(skeleton).not.toBeInTheDocument();

		expect(getIconWrappers(container)).toHaveLength(0);

		// No element node renders at all (only Svelte's {#if} anchor comment), so a caller's
		// styleClass adds no stray spacing when there is nothing to show.
		expect(container.querySelector('*')).toBeNull();
	});

	it('applies z-index to each icon wrapper', () => {
		const { container } = render(OverlappedLogos, { props: { icons: mockIcons } });

		const wrappers = getIconWrappers(container);

		expect(wrappers).toHaveLength(mockIcons.length);

		wrappers.forEach((wrapper, i) => {
			expect(wrapper.style.zIndex).toBe(`${i + 1}`);
		});
	});
});
