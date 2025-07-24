import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ethKnownDestinations } from '$eth/derived/eth-transactions.derived';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { ethAddressStore } from '$lib/stores/address.store';
import { token } from '$lib/stores/token.store';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import type { MinterInfo as CkEthMinterInfo } from '@dfinity/cketh/dist/candid/minter';
import { get } from 'svelte/store';

describe('eth-transactions.derived', () => {
	const mockCkEthMinterInfo = {
		data: { minimum_withdrawal_amount: [500n] } as CkEthMinterInfo,
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
});
