import OisyTradeMark from '$lib/components/trading/OisyTradeMark.svelte';
import { render } from '@testing-library/svelte';

describe('OisyTradeMark', () => {
	it('renders the round mark with an accessible label', () => {
		const { getByLabelText } = render(OisyTradeMark);

		expect(getByLabelText('OISY TRADE')).toBeInTheDocument();
	});

	it('renders an icon inside the mark', () => {
		const { getByLabelText } = render(OisyTradeMark);

		expect(getByLabelText('OISY TRADE').querySelector('svg')).not.toBeNull();
	});
});
