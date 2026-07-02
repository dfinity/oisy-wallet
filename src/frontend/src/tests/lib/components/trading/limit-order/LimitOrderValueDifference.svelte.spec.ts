import LimitOrderValueDifference from '$lib/components/trading/limit-order/LimitOrderValueDifference.svelte';
import { render } from '@testing-library/svelte';

describe('LimitOrderValueDifference', () => {
	it('formats a positive value with a leading plus sign', () => {
		const { container } = render(LimitOrderValueDifference, {
			props: { value: 3.456, crossing: false }
		});

		expect(container).toHaveTextContent('+3.46%');
	});

	it('formats a negative value without an extra plus sign', () => {
		const { container } = render(LimitOrderValueDifference, {
			props: { value: -2.1, crossing: false }
		});

		expect(container).toHaveTextContent('-2.10%');
	});

	it('formats zero without a sign', () => {
		const { container } = render(LimitOrderValueDifference, {
			props: { value: 0, crossing: false }
		});

		expect(container).toHaveTextContent('0.00%');
	});

	it('rounds a sub-threshold negative value to a clean 0.00% (no minus sign)', () => {
		const { container } = render(LimitOrderValueDifference, {
			props: { value: -0.001, crossing: false }
		});

		expect(container).toHaveTextContent('0.00%');
		expect(container).not.toHaveTextContent('-0.00%');
	});

	it('does not render the warning icon when not crossing', () => {
		const { container } = render(LimitOrderValueDifference, {
			props: { value: -8, crossing: false }
		});

		expect(container.querySelector('svg')).toBeNull();
	});

	it('renders the warning icon when crossing', () => {
		const { container } = render(LimitOrderValueDifference, {
			props: { value: 1, crossing: true }
		});

		expect(container.querySelector('svg')).not.toBeNull();
	});

	it('applies the danger color when crossing and value is below -5', () => {
		const { container } = render(LimitOrderValueDifference, {
			props: { value: -6, crossing: true }
		});

		const span = container.querySelector('span');

		expect(span?.className).toContain('text-error-primary');
		expect(span?.className).toContain('font-semibold');
	});

	it('applies the warning color when crossing and value is not below -5', () => {
		const { container } = render(LimitOrderValueDifference, {
			props: { value: -1, crossing: true }
		});

		const span = container.querySelector('span');

		expect(span?.className).toContain('text-warning-primary');
		expect(span?.className).not.toContain('text-error-primary');
	});

	it('applies the neutral primary color when not crossing', () => {
		const { container } = render(LimitOrderValueDifference, {
			props: { value: -10, crossing: false }
		});

		const span = container.querySelector('span');

		expect(span?.className).toContain('text-primary');
		expect(span?.className).not.toContain('font-semibold');
	});
});
