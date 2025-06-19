import BtcTokenModal from '$btc/components/tokens/BtcTokenModal.svelte';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { modalStore } from '$lib/stores/modal.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

describe('BtcTokenModal', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('necessary content is displayed', () => {
		mockPage.mock({
			token: BTC_MAINNET_TOKEN.name,
			network: BTC_MAINNET_TOKEN.network.id.description
		});

		const { container } = render(BtcTokenModal);

		modalStore.openBtcToken({ id: BTC_MAINNET_TOKEN.id, data: undefined });

		expect(container).toHaveTextContent(BTC_MAINNET_TOKEN.network.name);
		expect(container).toHaveTextContent(BTC_MAINNET_TOKEN.name);
		expect(container).toHaveTextContent(BTC_MAINNET_TOKEN.symbol);
		expect(container).toHaveTextContent(`${BTC_MAINNET_TOKEN.decimals}`);
	});
});
