import {
	SOL_DEVNET_EXPLORER_URL,
	SOL_MAINNET_EXPLORER_URL,
	SOL_TESTNET_EXPLORER_URL
} from '$env/explorers.env';
import * as solEnv from '$env/networks/networks.sol.env';
import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
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
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('SolTokenMenu', () => {
	beforeAll(() => {
		testnetsStore.set({ key: 'testnets', value: { enabled: true } });
	});

	beforeEach(() => {
		mockPage.reset();

		vi.spyOn(solEnv, 'SOLANA_NETWORK_ENABLED', 'get').mockImplementation(() => true);

		solAddressMainnetStore.reset();
		solAddressTestnetStore.reset();
		solAddressDevnetStore.reset();
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
			erc20UserTokensStore.reset(token.id);
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
});
