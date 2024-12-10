import { render, waitFor } from '@testing-library/svelte';
import BtcTokenMenu from '$btc/components/tokens/BtcTokenMenu.svelte';
import { token } from '$lib/stores/token.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { BTC_MAINNET_EXPLORER_URL } from '$env/explorers.env';

describe('BtcTokenMenu', () => {
	const tokenMenuButtonSelector = 'button[data-tid="btc-token-menu-button"]';
	const explorerLinkSelector = 'a[data-tid="btc-explorer-link"]';

	it('has link to correct explorer url', async () => {
		token.set(BTC_MAINNET_TOKEN);
		erc20UserTokensStore.reset(BTC_MAINNET_TOKEN.id)

		const { container } = render(BtcTokenMenu);
		const button: HTMLButtonElement | null = container.querySelector(tokenMenuButtonSelector);
		button?.click();

		await waitFor(() => {
			const a: HTMLAnchorElement | null = container.querySelector(explorerLinkSelector);
			if (a == null) throw new Error('anchor not yet loaded');

			expect(a.href).toEqual(`${BTC_MAINNET_EXPLORER_URL}/`);
		});
	});
});