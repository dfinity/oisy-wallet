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

	it('renders a skeleton when icons array is empty', () => {
		const { container } = render(OverlappedLogos, { props: { icons: [] } });

		const images = container.querySelectorAll('img');

		expect(images).toHaveLength(0);

		const skeleton = container.querySelector('.w-12');

		expect(skeleton).toBeInTheDocument();
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
