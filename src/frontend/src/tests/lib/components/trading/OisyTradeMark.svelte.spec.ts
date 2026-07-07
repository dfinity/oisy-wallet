import OisyTradeMark from '$lib/components/trading/OisyTradeMark.svelte';
import { render } from '@testing-library/svelte';

describe('OisyTradeMark', () => {
	it('renders the round mark with an accessible label', () => {
		const { getByLabelText } = render(OisyTradeMark);

		expect(getByLabelText('OISY TRADE')).toBeInTheDocument();
	});

	it('renders at the default size', () => {
		const { getByLabelText } = render(OisyTradeMark);

		expect(getByLabelText('OISY TRADE')).toHaveAttribute('width', '64');
		expect(getByLabelText('OISY TRADE')).toHaveAttribute('height', '64');
	});

	it('renders at a custom size', () => {
		const { getByLabelText } = render(OisyTradeMark, { props: { size: '42' } });

		expect(getByLabelText('OISY TRADE')).toHaveAttribute('width', '42');
		expect(getByLabelText('OISY TRADE')).toHaveAttribute('height', '42');
	});

	it('gives each instance unique clipPath / filter ids', () => {
		const first = render(OisyTradeMark).container.querySelector('clipPath')?.id;
		const second = render(OisyTradeMark).container.querySelector('clipPath')?.id;

		expect(first).toBeTruthy();
		expect(second).toBeTruthy();
		expect(first).not.toBe(second);
	});
});
