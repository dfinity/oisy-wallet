import {
	SOL_DEVNET_EXPLORER_URL,
	SOL_MAINNET_EXPLORER_URL,
	SOL_TESTNET_EXPLORER_URL
} from '$env/explorers.env';
import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
import { TRUMP_TOKEN } from '$env/tokens/tokens-spl/tokens.trump.env';
import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import {
	TOKEN_MENU_SOL_BUTTON,
	TOKEN_MENU_SOL_EXPLORER_LINK
} from '$lib/constants/test-ids.constants';
import {
	solAddressDevnetStore,
	solAddressMainnetStore,
	solAddressTestnetStore
} from '$lib/stores/address.store';
import { testnetsStore } from '$lib/stores/settings.store';
import { token as tokenStore } from '$lib/stores/token.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import SolTokenMenu from '$sol/components/tokens/SolTokenMenu.svelte';
import type { SolanaNetwork } from '$sol/types/network';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('SolTokenMenu', () => {
	beforeAll(() => {
		testnetsStore.set({ key: 'testnets', value: { enabled: true } });
	});

	beforeEach(() => {
		mockPage.reset();

		solAddressMainnetStore.reset();
		solAddressTestnetStore.reset();
		solAddressDevnetStore.reset();

		// In component TOkenMenu there is a dependency to the store erc20UserTokensStore that impedes the correct rendering of the component
		// So we need to reset the store before each test
		// TODO: verify if this dependency can be removed
		erc20UserTokensStore.resetAll();
	});

	const testCases = [
		{
			token: SOLANA_TOKEN,
			explorerUrl: SOL_MAINNET_EXPLORER_URL,
			network: SOLANA_MAINNET_NETWORK,
			store: solAddressMainnetStore,
			description: 'mainnet'
		},
		{
			token: SOLANA_TESTNET_TOKEN,
			explorerUrl: SOL_TESTNET_EXPLORER_URL,
			network: SOLANA_TESTNET_NETWORK,
			store: solAddressTestnetStore,
			description: 'testnet'
		},
		{
			token: SOLANA_DEVNET_TOKEN,
			explorerUrl: SOL_DEVNET_EXPLORER_URL,
			network: SOLANA_DEVNET_NETWORK,
			store: solAddressDevnetStore,
			description: 'devnet'
		}
	];

	it.each(testCases)(
		'external link forwards to correct $description explorer',
		async ({ token, explorerUrl, network, store }) => {
			tokenStore.set(token);
			store.set({ certified: true, data: mockSolAddress });
			mockPage.mock({ network: network.id.description });

			const { queryByTestId, getByTestId } = render(SolTokenMenu);
			const button = getByTestId(TOKEN_MENU_SOL_BUTTON);
			button.click();

			await waitFor(() => {
				const a = queryByTestId(TOKEN_MENU_SOL_EXPLORER_LINK);
				expect(a).not.toBeNull();
				expect((a as HTMLAnchorElement).href).toEqual(
					replacePlaceholders(explorerUrl, { $args: `account/${mockSolAddress}/` })
				);
			});
		}
	);

	it('external link forwards to SPL explorer URL', async () => {
		const mockToken = TRUMP_TOKEN;

		tokenStore.set(mockToken);
		mockPage.mock({ network: mockToken.network.id.description });

		const { queryByTestId, getByTestId } = render(SolTokenMenu);
		const button = getByTestId(TOKEN_MENU_SOL_BUTTON);
		button.click();

		await waitFor(() => {
			const a = queryByTestId(TOKEN_MENU_SOL_EXPLORER_LINK);
			expect(a).not.toBeNull();
			expect((a as HTMLAnchorElement).href).toEqual(
				replacePlaceholders((mockToken.network as SolanaNetwork).explorerUrl ?? '', {
					$args: `token/${mockToken.address}/`
				})
			);
		});
	});
});
