import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import {
	clearIdbBalances,
	deleteIdbBalances,
	getIdbBalances,
	setIdbBalancesStore
} from '$lib/api/idb-balances.api';
import { balancesStore } from '$lib/stores/balances.store';
import type { Balance } from '$lib/types/balance';
import { delMultiKeysByPrincipal } from '$lib/utils/idb.utils';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import * as idbKeyval from 'idb-keyval';
import { createStore } from 'idb-keyval';
import { get } from 'svelte/store';

vi.mock('$lib/utils/idb.utils', () => ({
	delMultiKeysByPrincipal: vi.fn()
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('idb-balances.api', () => {
	const mockIdbBalancesStore = createStore('mock-store', 'mock-store');

	const mockToken1 = ETHEREUM_TOKEN;
	const mockToken2 = BTC_MAINNET_TOKEN;
	const mockToken3 = USDC_TOKEN;
	const mockTokens = [mockToken1, mockToken2, mockToken3];

	const mockBalance1: Balance = 1n;
	const mockBalance2: Balance = 101n;
	const mockBalance3: Balance = 1000n;

	const mockParams = {
		identity: mockIdentity,
		mockIdbBalancesStore,
		tokens: mockTokens
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockTokens.forEach(({ id }) => {
			balancesStore.reset(id);
		});

		balancesStore.set({
			id: mockToken1.id,
			data: {
				data: mockBalance1,
				certified: false
			}
		});
		balancesStore.set({
			id: mockToken2.id,
			data: {
				data: mockBalance2,
				certified: true
			}
		});
		balancesStore.set({
			id: mockToken3.id,
			data: {
				data: mockBalance3,
				certified: false
			}
		});
	});

	describe('setIdbBalancesStore', () => {
		it('should not set the balances in the IDB if the identity is nullish', async () => {
			await setIdbBalancesStore({
				...mockParams,
				identity: null,
				balancesStoreData: get(balancesStore)
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();

			await setIdbBalancesStore({
				...mockParams,
				identity: undefined,
				balancesStoreData: get(balancesStore)
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should not set the balances in the IDB if the balances store data is nullish', async () => {
			await setIdbBalancesStore({
				...mockParams,
				balancesStoreData: undefined
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should set the certified balances in the IDB', async () => {
			await setIdbBalancesStore({
				...mockParams,
				balancesStoreData: get(balancesStore)
			});

			expect(idbKeyval.set).toHaveBeenCalledTimes(mockTokens.length);
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				[
					mockIdentity.getPrincipal().toText(),
					mockToken1.id.description,
					mockToken1.network.id.description
				],
				mockBalance1,
				mockIdbBalancesStore
			);
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				2,
				[
					mockIdentity.getPrincipal().toText(),
					mockToken2.id.description,
					mockToken2.network.id.description
				],
				mockBalance2,
				mockIdbBalancesStore
			);
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				3,
				[
					mockIdentity.getPrincipal().toText(),
					mockToken3.id.description,
					mockToken3.network.id.description
				],
				mockBalance3,
				mockIdbBalancesStore
			);
		});

		it('should not set the balances in the IDB for the tokens with nullish balance', async () => {
			balancesStore.reset(mockToken1.id);

			await setIdbBalancesStore({
				...mockParams,
				balancesStoreData: get(balancesStore)
			});

			expect(idbKeyval.set).toHaveBeenCalledTimes(mockTokens.length - 1);
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				[
					mockIdentity.getPrincipal().toText(),
					mockToken2.id.description,
					mockToken2.network.id.description
				],
				mockBalance2,
				mockIdbBalancesStore
			);
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				2,
				[
					mockIdentity.getPrincipal().toText(),
					mockToken3.id.description,
					mockToken3.network.id.description
				],
				mockBalance3,
				mockIdbBalancesStore
			);
		});

		it('should not set the balances in the IDB if the balances are nullish for all tokens', async () => {
			mockTokens.forEach(({ id }) => {
				balancesStore.reset(id);
			});

			await setIdbBalancesStore({
				...mockParams,
				balancesStoreData: get(balancesStore)
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should ignore errors if a single token throws', async () => {
			vi.mocked(idbKeyval.set).mockRejectedValueOnce(new Error('Mocked error'));

			await expect(
				setIdbBalancesStore({
					...mockParams,
					balancesStoreData: get(balancesStore)
				})
			).resolves.not.toThrow();

			expect(idbKeyval.set).toHaveBeenCalledTimes(mockTokens.length);
		});
	});

	describe('getIdbBalances', () => {
		it('should get balances', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(mockTokens);

			const result = await getIdbBalances({
				principal: mockPrincipal,
				tokenId: mockToken1.id,
				networkId: mockToken1.network.id
			});

			expect(result).toEqual(mockTokens);
			expect(idbKeyval.get).toHaveBeenCalledWith(
				[mockPrincipal.toText(), mockToken1.id.description, mockToken1.network.id.description],
				expect.any(Object)
			);
		});
	});

	describe('deleteIdbBalances', () => {
		it('should delete balances', async () => {
			await deleteIdbBalances(mockPrincipal);

			expect(delMultiKeysByPrincipal).toHaveBeenCalledExactlyOnceWith({
				principal: mockPrincipal,
				store: expect.any(Object)
			});
		});
	});

	describe('clearIdbBalances', () => {
		it('should clear balances', async () => {
			await clearIdbBalances();

			expect(idbKeyval.clear).toHaveBeenCalledExactlyOnceWith(expect.any(Object));
		});
	});
});
