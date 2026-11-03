import BtcTransactionsHeader from '$btc/components/transactions/BtcTransactionsHeader.svelte';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('BtcTransactionsHeader', () => {
	beforeEach(() => {
		mockPage.reset();
		mockPage.mockNetwork(BTC_MAINNET_NETWORK_ID.description);
	});

	it('says whether the mainnet info is open', async () => {
		const { getByLabelText } = render(BtcTransactionsHeader);

		const infoButton = getByLabelText(en.core.text.info);

		expect(infoButton).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(infoButton);

		expect(infoButton).toHaveAttribute('aria-expanded', 'true');

		await fireEvent.click(infoButton);

		expect(infoButton).toHaveAttribute('aria-expanded', 'false');
	});
});
