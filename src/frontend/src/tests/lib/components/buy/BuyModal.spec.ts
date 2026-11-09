import * as onRamperEnv from '$env/rest/onramper.env';
import BuyModal from '$lib/components/buy/BuyModal.svelte';
import { modalStore } from '$lib/stores/modal.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('BuyModal', () => {
	it('renders correct title if isOnRamperDev is true', () => {
		vi.spyOn(onRamperEnv, 'isOnRamperDev', 'get').mockImplementation(() => true);
		const { getByText } = render(BuyModal);

		expect(getByText(en.buy.text.buy_dev)).toBeInTheDocument();
	});

	it('renders correct title if isOnRamperDev is false', () => {
		vi.spyOn(onRamperEnv, 'isOnRamperDev', 'get').mockImplementation(() => false);
		const { getByText } = render(BuyModal);

		expect(getByText(en.buy.text.buy)).toBeInTheDocument();
	});

	it('stays open on a backdrop click', async () => {
		const close = vi.spyOn(modalStore, 'close');
		const { getByTestId } = render(BuyModal);

		await fireEvent.click(getByTestId('backdrop'));

		expect(close).not.toHaveBeenCalled();
	});
});
