import BestRateBadge from '$lib/components/ui/BestRateBadge.svelte';
import { screensStore } from '$lib/stores/screens.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('BestRateBadge', () => {
	it('allows the caller to override the default top margin', () => {
		const { container } = render(BestRateBadge, { props: { styleClass: 'mt-0' } });

		expect(container.firstElementChild).toHaveClass('mt-0');
		expect(container.firstElementChild).not.toHaveClass('mt-1');
	});

	it('should render component', () => {
		const { container } = render(BestRateBadge);

		expect(container.firstChild).toBeInTheDocument();
	});

	it('should render star icon', () => {
		const { container } = render(BestRateBadge);

		const icon = container.querySelector('svg');

		expect(icon).toBeInTheDocument();
	});

	it('should have success variant badge', () => {
		const { container } = render(BestRateBadge);

		const badge = container.querySelector('[class*="success"]');

		expect(badge).toBeInTheDocument();
	});

	it('should render badge with correct classes', () => {
		const { container } = render(BestRateBadge);

		const badge = container.querySelector('[class*="mt-1"]');

		expect(badge).toBeInTheDocument();
	});

	it('should show the label from md', () => {
		screensStore.set('md');

		const { getByText } = render(BestRateBadge);

		expect(getByText(en.swap.text.best_rate)).not.toHaveClass('sr-only');
	});

	it('should keep the label for screen readers on phones, where only the star shows', () => {
		screensStore.set('xs');

		const { getByText } = render(BestRateBadge);

		expect(getByText(en.swap.text.best_rate)).toHaveClass('sr-only');
	});
});
