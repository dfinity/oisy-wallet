import LoaderSolBalances from '$sol/components/core/LoaderSolBalances.svelte';
import * as solBalanceServices from '$sol/services/sol-balance.services';
import { render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID,
	SOLANA_TESTNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_LOCAL_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	solAddressTestnetStore
} from '$lib/stores/address.store';
import { mockSolAddress } from '$tests/mocks/sol.mock';

vi.mock('$sol/services/sol-balance.services');

describe('LoaderSolBalances', () => {
	const mockLoadSolBalance = vi.fn();
	const mockAddress = { data: mockSolAddress, certified: true };

	beforeEach(() => {
		solAddressMainnetStore.reset();
		solAddressTestnetStore.reset();
		solAddressDevnetStore.reset();
		solAddressLocalnetStore.reset();

		vi.clearAllMocks();
		vi.spyOn(solBalanceServices, 'loadSolBalance').mockImplementation(mockLoadSolBalance);
	});

	it('should not load balances if no addresses are set', async () => {
		render(LoaderSolBalances);

		// Wait for potential async operations
		await new Promise((resolve) => setTimeout(resolve, 600));

		expect(mockLoadSolBalance).not.toHaveBeenCalled();
	});

	const networkTestCases = [
		{
			store: solAddressMainnetStore,
			networkId: SOLANA_MAINNET_NETWORK_ID,
			tokenId: SOLANA_TOKEN.id
		},
		{
			store: solAddressTestnetStore,
			networkId: SOLANA_TESTNET_NETWORK_ID,
			tokenId: SOLANA_TESTNET_TOKEN.id
		},
		{
			store: solAddressDevnetStore,
			networkId: SOLANA_DEVNET_NETWORK_ID,
			tokenId: SOLANA_DEVNET_TOKEN.id
		},
		{
			store: solAddressLocalnetStore,
			networkId: SOLANA_LOCAL_NETWORK_ID,
			tokenId: SOLANA_LOCAL_TOKEN.id
		}
	] as const;

	it.each(networkTestCases)(
		'should only load $networkId balance when $network address changes',
		async ({ store, networkId, tokenId }) => {
			render(LoaderSolBalances);

			store.set(mockAddress);

			await new Promise((resolve) => setTimeout(resolve, 600));

			expect(mockLoadSolBalance).toHaveBeenCalledOnce();
			expect(mockLoadSolBalance).toHaveBeenCalledWith({
				networkId,
				tokenId
			});
		}
	);
});
