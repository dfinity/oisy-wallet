import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { AnyTransactionUiWithCmp } from '$lib/types/transaction';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';

export const createTransactionsUiWithCmp = (n: number): AnyTransactionUiWithCmp[] =>
	Array.from({ length: n }, (_, i) => ({
		transaction: {
			id: `id-${i}`,
			type: 'send',
			status: 'executed',
			transactionComponent: 'transactionComponent',
			timestamp: BigInt(i),
			from: 'from',
			to: 'to'
		},
		component: 'ic'
	}));

export const knownDestinations = {
	[mockBtcAddress]: {
		amounts: [{ value: 10000000n, token: BTC_MAINNET_TOKEN }],
		timestamp: 1671234567890,
		address: mockBtcAddress
	},
	[mockEthAddress]: {
		amounts: [{ value: 10000000n, token: ETHEREUM_TOKEN }],
		timestamp: 1671234567890,
		address: mockEthAddress
	},
	[mockSolAddress]: {
		amounts: [{ value: 10000000n, token: SOLANA_TOKEN }],
		timestamp: 1671234567890,
		address: mockSolAddress
	}
};
