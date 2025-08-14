import BreadcrumbNavigation from '$lib/components/ui/BreadcrumbNavigation.svelte';
import { render, screen } from '@testing-library/svelte';

const items = [
	{ label: 'Home', url: '/' },
	{ label: 'Collections', url: '/collections' },
	{ label: 'Azuki', url: '/collections/azuki' }
];

describe('BreadcrumbNavigation', () => {
	it('renders all items as links with correct labels and hrefs', () => {
		render(BreadcrumbNavigation, { items });

		const links = screen.getAllByRole('link');

		expect(links).toHaveLength(items.length);

		links.forEach((link, i) => {
			expect(link).toHaveTextContent(items[i].label);
			expect(link).toHaveAttribute('href', items[i].url);
		});
	});

	it('preserves item order', () => {
		render(BreadcrumbNavigation, { items });

		const labelsInDom = screen.getAllByRole('link').map((a) => a.textContent);

		expect(labelsInDom).toEqual(items.map((i) => i.label));
	});

	it('applies link styles', () => {
		render(BreadcrumbNavigation, { items });
		const links = screen.getAllByRole('link');

		links.forEach((link) => {
			expect(link).toHaveClass('text-brand-primary');
			expect(link).toHaveClass('no-underline');
		});
	});

	it('renders a separator after each item', () => {
		const { container } = render(BreadcrumbNavigation, { items });

		// Matches the <span>/</span> nodes
		const separators = Array.from(container.querySelectorAll('span')).filter(
			(el) => el.textContent === '/'
		);

		expect(separators).toHaveLength(items.length);
	});

	it('renders nothing when items is empty', () => {
		const { container } = render(BreadcrumbNavigation, { items: [] });

		expect(screen.queryAllByRole('link')).toHaveLength(0);

		// no separators either
		const seps = Array.from(container.querySelectorAll('span')).filter(
			(el) => el.textContent === '/'
		);

		expect(seps).toHaveLength(0);
	});

	it('has expected wrapper styles', () => {
		const { container } = render(BreadcrumbNavigation, { items });
		const wrapper = container.firstElementChild as HTMLElement;

		expect(wrapper).toHaveClass('flex', 'gap-2', 'text-xs', 'font-bold');
	});
});
