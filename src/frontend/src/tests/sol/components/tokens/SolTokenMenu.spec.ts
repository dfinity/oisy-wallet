import { SOL_DEVNET_EXPLORER_URL, SOL_MAINNET_EXPLORER_URL } from '$env/explorers.env';
import { TRUMP_TOKEN } from '$env/tokens/tokens-spl/tokens.trump.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import {
	TOKEN_MENU_SOL_BUTTON,
	TOKEN_MENU_SOL_EXPLORER_LINK
} from '$lib/constants/test-ids.constants';
import { solAddressDevnetStore, solAddressMainnetStore } from '$lib/stores/address.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import SolTokenMenu from '$sol/components/tokens/SolTokenMenu.svelte';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import type { SolanaNetwork } from '$sol/types/network';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render, waitFor } from '@testing-library/svelte';

describe('SolTokenMenu', () => {
	beforeAll(() => {
		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');
	});

	beforeEach(() => {
		mockPage.reset();

		solAddressMainnetStore.reset();
		solAddressDevnetStore.reset();

		// In component TokenMenu there is a dependency to the store erc20UserTokensStore that impedes the correct rendering of the component
		// So we need to reset the store before each test
		// TODO: verify if this dependency can be removed
		erc20UserTokensStore.resetAll();
	});

	const testCases = [
		{
			token: SOLANA_TOKEN,
			explorerUrl: SOL_MAINNET_EXPLORER_URL,
			store: solAddressMainnetStore,
			description: 'mainnet'
		},
		{
			token: SOLANA_DEVNET_TOKEN,
			explorerUrl: SOL_DEVNET_EXPLORER_URL,
			store: solAddressDevnetStore,
			description: 'devnet'
		}
	];

	it.each(testCases)(
		'external link forwards to correct $description explorer',
		async ({ token, explorerUrl, store }) => {
			mockPage.mockToken(token);
			store.set({ certified: true, data: mockSolAddress });

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

		vi.spyOn(enabledSplTokens, 'subscribe').mockImplementation((fn) => {
			fn([{ ...mockToken, enabled: true }]);
			return () => {};
		});

		mockPage.mockToken(mockToken);

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
