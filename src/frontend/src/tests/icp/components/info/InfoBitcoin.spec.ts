import InfoBitcoin from '$icp/components/info/InfoBitcoin.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('InfoBitcoin', () => {
	it('should render title correctly', () => {
		const { getByText } = render(InfoBitcoin);

		expect(getByText(en.info.bitcoin.title)).toBeDefined();
	});

	it('should render description correctly', () => {
		const { getByText } = render(InfoBitcoin);

		expect(getByText(en.info.bitcoin.description)).toBeDefined();
	});

	it('should render note correctly', () => {
		const { getByText } = render(InfoBitcoin);

		expect(getByText(en.info.bitcoin.note)).toBeDefined();
	});

	it('should how-to message correctly', () => {
		const { getByText } = render(InfoBitcoin);

		expect(getByText(en.info.bitcoin.how_to)).toBeDefined();
	});
});
