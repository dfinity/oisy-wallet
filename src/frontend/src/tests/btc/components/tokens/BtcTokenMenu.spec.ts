import BtcTokenMenu from '$btc/components/tokens/BtcTokenMenu.svelte';
import { BTC_MAINNET_EXPLORER_URL } from '$env/explorers.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { btcAddressMainnetStore } from '$lib/stores/address.store';
import { token } from '$lib/stores/token.store';
import { render, waitFor } from '@testing-library/svelte';

describe('BtcTokenMenu', () => {
	const mockAddressMainnet = 'mainnet-address';

	const tokenMenuButtonSelector = 'button[data-tid="btc-token-menu-button"]';
	const explorerLinkSelector = 'a[data-tid="btc-explorer-link"]';

	it('has link to correct explorer url', async () => {
		token.set(BTC_MAINNET_TOKEN);
		erc20UserTokensStore.reset(BTC_MAINNET_TOKEN.id);
		btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });

		const { container } = render(BtcTokenMenu);
		const button: HTMLButtonElement | null = container.querySelector(tokenMenuButtonSelector);
		button?.click();

		await waitFor(() => {
			const a: HTMLAnchorElement | null = container.querySelector(explorerLinkSelector);
			if (a == null) {
				throw new Error('anchor not yet loaded');
			}

			expect(a.href).toEqual(`${BTC_MAINNET_EXPLORER_URL}/address/${mockAddressMainnet}`);
		});
	});
});
