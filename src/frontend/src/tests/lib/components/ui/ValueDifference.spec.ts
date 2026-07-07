import ValueDifference from '$lib/components/ui/ValueDifference.svelte';
import { render } from '@testing-library/svelte';

describe('ValueDifference', () => {
	it('formats a positive value with a leading plus sign', () => {
		const { container } = render(ValueDifference, { props: { value: 3.456 } });

		expect(container).toHaveTextContent('+3.46%');
	});

	it('formats a negative value without an extra plus sign', () => {
		const { container } = render(ValueDifference, { props: { value: -2.1 } });

		expect(container).toHaveTextContent('-2.10%');
	});

	it('formats zero without a sign', () => {
		const { container } = render(ValueDifference, { props: { value: 0 } });

		expect(container).toHaveTextContent('0.00%');
	});

	it('rounds a sub-threshold negative value to a clean 0.00% (no minus sign)', () => {
		const { container } = render(ValueDifference, { props: { value: -0.001 } });

		expect(container).toHaveTextContent('0.00%');
		expect(container).not.toHaveTextContent('-0.00%');
	});

	it('rounds a sub-threshold positive value to a clean 0.00% (no plus sign)', () => {
		const { container } = render(ValueDifference, { props: { value: 0.004 } });

		expect(container).toHaveTextContent('0.00%');
		expect(container).not.toHaveTextContent('+0.00%');
	});

	it('renders nothing when the value is undefined', () => {
		const { container } = render(ValueDifference, { props: { value: undefined } });

		expect(container).toHaveTextContent('');
	});

	it('renders nothing when the value is not finite', () => {
		const { container } = render(ValueDifference, { props: { value: Number.NaN } });

		expect(container).toHaveTextContent('');
	});
});
