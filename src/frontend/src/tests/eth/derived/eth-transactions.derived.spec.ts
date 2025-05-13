import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ethKnownDestinations } from '$eth/derived/eth-transactions.derived';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import { ethAddressStore } from '$lib/stores/address.store';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import type { MinterInfo as CkEthMinterInfo } from '@dfinity/cketh/dist/candid/minter';
import { get } from 'svelte/store';

describe('eth-transactions.derived', () => {
	const mockCkEthMinterInfo = {
		data: { minimum_withdrawal_amount: [500n] } as CkEthMinterInfo,
		certified: true
	};
	const transactions = createMockEthTransactions(5);

	describe('ethKnownDestinations', () => {
		beforeEach(() => {
			ethTransactionsStore.reset();
			ethAddressStore.set({ certified: true, data: mockEthAddress });
		});

		it('should return known destinations if transactions store has some data and helper addresses available', () => {
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
				transactions
			});

			expect(get(ethKnownDestinations)).toEqual({
				[transactions[0].to as string]: {
					amounts: transactions.map(({ value }) => value),
					timestamp: Number(transactions[0].timestamp)
				}
			});
		});

		it('should return empty object if transactions store does not have data', () => {
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
