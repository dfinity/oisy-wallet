import BtcTokenMenu from '$btc/components/tokens/BtcTokenMenu.svelte';
import {
	BTC_MAINNET_EXPLORER_URL,
	BTC_REGTEST_EXPLORER_URL,
	BTC_TESTNET_EXPLORER_URL
} from '$env/explorers.env';
import * as btcEnv from '$env/networks/networks.btc.env';
import {
	BTC_MAINNET_NETWORK,
	BTC_REGTEST_NETWORK,
	BTC_TESTNET_NETWORK
} from '$env/networks/networks.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { TOKEN_MENU_BTC_BUTTON } from '$lib/constants/test-ids.constants';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore
} from '$lib/stores/address.store';
import { token } from '$lib/stores/token.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('BtcTokenMenu', () => {
	const mockAddressMainnet = 'mainnet-address';
	const mockAddressTestnet = 'testnet-address';
	const mockAddressRegtest = 'regtest-address';

	const tokenMenuButtonSelector = `button[data-tid="${TOKEN_MENU_BTC_BUTTON}"]`;
	const explorerLinkSelector = 'a[data-tid="btc-explorer-link"]';

	beforeEach(() => {
		mockPage.reset();

		btcAddressMainnetStore.reset();
		btcAddressTestnetStore.reset();
		btcAddressRegtestStore.reset();
	});

	it('external link forwards to correct mainnet explorer', async () => {
		token.set(BTC_MAINNET_TOKEN);
		erc20UserTokensStore.reset(BTC_MAINNET_TOKEN.id);
		btcAddressMainnetStore.set({ certified: true, data: mockAddressMainnet });
		mockPage.mock({ network: BTC_MAINNET_NETWORK.id.description });

		vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementationOnce(() => true);

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

	it('external link forwards to correct testnet explorer', async () => {
		token.set(BTC_TESTNET_TOKEN);
		erc20UserTokensStore.reset(BTC_TESTNET_TOKEN.id);
		btcAddressTestnetStore.set({ certified: true, data: mockAddressTestnet });
		mockPage.mock({ network: BTC_TESTNET_NETWORK.id.description });

		const { container } = render(BtcTokenMenu);
		const button: HTMLButtonElement | null = container.querySelector(tokenMenuButtonSelector);
		button?.click();

		await waitFor(() => {
			const a: HTMLAnchorElement | null = container.querySelector(explorerLinkSelector);
			if (a == null) {
				throw new Error('anchor not yet loaded');
			}

			expect(a.href).toEqual(`${BTC_TESTNET_EXPLORER_URL}/address/${mockAddressTestnet}`);
		});
	});

	it('external link forwards to correct regtest explorer', async () => {
		token.set(BTC_REGTEST_TOKEN);
		erc20UserTokensStore.reset(BTC_REGTEST_TOKEN.id);
		btcAddressRegtestStore.set({ certified: true, data: mockAddressRegtest });
		mockPage.mock({ network: BTC_REGTEST_NETWORK.id.description });

		const { container } = render(BtcTokenMenu);
		const button: HTMLButtonElement | null = container.querySelector(tokenMenuButtonSelector);
		button?.click();

		await waitFor(() => {
			const a: HTMLAnchorElement | null = container.querySelector(explorerLinkSelector);
			if (a == null) {
				throw new Error('anchor not yet loaded');
			}

			expect(a.href).toEqual(`${BTC_REGTEST_EXPLORER_URL}/address/${mockAddressRegtest}`);
		});
	});
});
