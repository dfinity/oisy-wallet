import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import {
	ercTransfersByNetworkAndHash,
	ethKnownDestinations
} from '$eth/derived/eth-transactions.derived';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { ethAddressStore } from '$lib/stores/address.store';
import { token } from '$lib/stores/token.store';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import type { CkEthMinterDid } from '@icp-sdk/canisters/cketh';
import { get } from 'svelte/store';

const mockErcFungibleToken = { ...USDC_TOKEN, enabled: true };

const mockErcNonFungibleToken = { ...mockValidErc721Token, enabled: true };

vi.mock(import('$eth/derived/erc721.derived'), async (importOriginal) => {
	const { readable } = await import('svelte/store');
	const { mockValidErc721Token } = await import('$tests/mocks/erc721-tokens.mock');

	const mockToken = { ...mockValidErc721Token, enabled: true };

	return {
		...importOriginal,
		erc721Tokens: readable([mockToken]),
		enabledErc721Tokens: readable([mockToken])
	};
});

vi.mock(import('$eth/derived/erc-fungible.derived'), async (importOriginal) => {
	const { readable } = await import('svelte/store');
	const { USDC_TOKEN } = await import('$env/tokens/tokens-erc20/tokens.usdc.env');

	const mockToken = { ...USDC_TOKEN, enabled: true };

	return {
		...(await importOriginal()),
		ercFungibleTokens: readable([mockToken]),
		enabledErcFungibleTokens: readable([mockToken])
	};
});

describe('eth-transactions.derived', () => {
	const mockCkEthMinterInfo = {
		data: { minimum_withdrawal_amount: [500n] } as CkEthMinterDid.MinterInfo,
		certified: true
	};
	const transactions = createMockEthTransactions(5);

	const setupStores = () => {
		ckEthMinterInfoStore.set({
			id: ETHEREUM_TOKEN_ID,
			data: {
				...mockCkEthMinterInfo,
				data: {
					...mockCkEthMinterInfo.data,
					eth_helper_contract_address: ['test']
				}
			}
		});
		ethTransactionsStore.add({
			tokenId: ETHEREUM_TOKEN_ID,
			transactions: transactions.map((data) => ({ data, certified: false }))
		});
	};

	describe('ethKnownDestinations', () => {
		beforeEach(() => {
			ethTransactionsStore.reset(ETHEREUM_TOKEN_ID);
			token.reset();
			ethAddressStore.set({ certified: true, data: mockEthAddress });
		});

		it('should return known destinations if transactions store has some data and helper addresses available and network matches', () => {
			token.set(ETHEREUM_TOKEN);
			setupStores();

			expect(get(ethKnownDestinations)).toEqual({
				[transactions[0].to as string]: {
					amounts: transactions.map(({ value }) => ({ value, token: ETHEREUM_TOKEN })),
					timestamp: Number(transactions[0].timestamp),
					address: transactions[0].to
				}
			});
		});

		it('should return empty object if transactions store has data but network does not match', () => {
			token.set(BASE_ETH_TOKEN);
			setupStores();

			expect(get(ethKnownDestinations)).toEqual({});
		});

		it('should return empty object if transactions store does not have data at all', () => {
			expect(get(ethKnownDestinations)).toEqual({});
		});

		it('should return empty object if helper addresses are not available', () => {
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: mockCkEthMinterInfo
			});

			expect(get(ethKnownDestinations)).toEqual({});
		});
	});

	describe('ercTransfersByNetworkAndHash', () => {
		const [erc20Transaction] = createMockEthTransactions(1);

		beforeEach(() => {
			ethTransactionsStore.reset(USDC_TOKEN.id);
			ethTransactionsStore.reset(ETHEREUM_TOKEN_ID);
			ethTransactionsStore.reset(mockValidErc721Token.id);
		});

		it('should index the loaded ERC fungible transfers by network and hash', () => {
			ethTransactionsStore.set({
				tokenId: USDC_TOKEN.id,
				transactions: [{ data: erc20Transaction, certified: false }]
			});

			expect(
				get(ercTransfersByNetworkAndHash)
					.get(USDC_TOKEN.network.id)
					?.get(erc20Transaction.hash as string)
			).toStrictEqual([{ transaction: erc20Transaction, token: mockErcFungibleToken }]);
		});

		it('should not index the transactions of the native token', () => {
			ethTransactionsStore.set({
				tokenId: ETHEREUM_TOKEN_ID,
				transactions: [{ data: erc20Transaction, certified: false }]
			});

			expect(get(ercTransfersByNetworkAndHash).size).toBe(0);
		});

		it('should be empty when no transactions are loaded', () => {
			expect(get(ercTransfersByNetworkAndHash).size).toBe(0);
		});

		it('should index the transfers of non-fungible tokens too', () => {
			ethTransactionsStore.set({
				tokenId: mockValidErc721Token.id,
				transactions: [{ data: erc20Transaction, certified: false }]
			});

			expect(
				get(ercTransfersByNetworkAndHash)
					.get(mockValidErc721Token.network.id)
					?.get(erc20Transaction.hash as string)
			).toStrictEqual([{ transaction: erc20Transaction, token: mockErcNonFungibleToken }]);
		});
	});
});
