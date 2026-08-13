import LiquidiumHealthFactor from '$lib/components/liquidium/LiquidiumHealthFactor.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LiquidiumHealthFactor', () => {
	it('renders the rounded percentage and the default label', () => {
		const { container } = render(LiquidiumHealthFactor, { props: { percent: 67.4 } });

		expect(container).toHaveTextContent('67%');
		expect(container).toHaveTextContent(en.liquidium.text.projected_health_factor);
	});

	it('uses the success colour for a healthy value', () => {
		const { container } = render(LiquidiumHealthFactor, { props: { percent: 80 } });

		expect(container.querySelector('.text-success-primary')).not.toBeNull();
	});

	it('uses the warning colour for an at-risk value', () => {
		const { container } = render(LiquidiumHealthFactor, { props: { percent: 30 } });

		expect(container.querySelector('.text-warning-primary')).not.toBeNull();
	});

	it('uses the error colour for a critical value', () => {
		const { container } = render(LiquidiumHealthFactor, { props: { percent: 5 } });

		expect(container.querySelector('.text-error-primary')).not.toBeNull();
	});

	it('renders a custom label and can hide the bar', () => {
		const { container } = render(LiquidiumHealthFactor, {
			props: { percent: 50, label: 'Custom label', showBar: false }
		});

		expect(container).toHaveTextContent('Custom label');
		// The gradient bar carries an inline linear-gradient background.
		expect(container.querySelector('[style*="linear-gradient"]')).toBeNull();
	});
});
