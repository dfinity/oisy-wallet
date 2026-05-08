import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { nonNullish } from '@dfinity/utils';
import { ZERO } from '$lib/constants/app.constants';
import type { ContactUi } from '$lib/types/contact';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import { EMPTY_TRANSACTIONS_FILTER } from '$lib/types/transactions-filter';
import {
	applyTransactionsFilter,
	transactionsFilterTokenKey
} from '$lib/utils/transactions-filter.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSolAddress2
} from '$tests/mocks/sol.mock';
import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';

const mockPrincipal = Principal.fromText(mockPrincipalText);
const mockDerivedAccountIdentifierHex = AccountIdentifier.fromPrincipal({
	principal: mockPrincipal,
	subAccount: undefined
}).toHex();

const btcSendTx = {
	component: 'bitcoin',
	token: BTC_MAINNET_TOKEN,
	transaction: {
		id: 'btc-1',
		type: 'send',
		status: 'confirmed',
		from: mockBtcAddress,
		to: ['receiver-btc-1'],
		value: 1000n,
		timestamp: ZERO
	}
} as unknown as AllTransactionUiWithCmp;

const btcReceiveTx = {
	component: 'bitcoin',
	token: BTC_MAINNET_TOKEN,
	transaction: {
		id: 'btc-2',
		type: 'receive',
		status: 'confirmed',
		from: 'sender-btc-2',
		to: [mockBtcAddress],
		value: 2000n,
		timestamp: ZERO
	}
} as unknown as AllTransactionUiWithCmp;

const ethSendTx = {
	component: 'ethereum',
	token: ETHEREUM_TOKEN,
	transaction: {
		id: 'eth-1',
		type: 'send',
		hash: '0xabc',
		from: mockEthAddress,
		to: mockEthAddress2,
		value: ZERO,
		gasLimit: ZERO,
		nonce: 0,
		chainId: 1n
	}
} as unknown as AllTransactionUiWithCmp;

const icpSendToHexTx = {
	component: 'ic',
	token: ICP_TOKEN,
	transaction: {
		id: 'icp-1',
		type: 'send',
		status: 'executed',
		from: 'caller-account-id',
		to: mockDerivedAccountIdentifierHex,
		value: 100n,
		timestamp: ZERO
	}
} as unknown as AllTransactionUiWithCmp;

const icpApproveTx = {
	component: 'ic',
	token: ICP_TOKEN,
	transaction: {
		id: 'icp-2',
		type: 'approve',
		status: 'executed',
		from: 'caller-account-id',
		to: 'spender-account-id',
		value: 50n,
		timestamp: ZERO
	}
} as unknown as AllTransactionUiWithCmp;

// `from` and `to` are SPL token-account (ATA) addresses; `fromOwner` and
// `toOwner` are the wallet-level addresses. We deliberately do NOT use a
// wallet address in `to` so the Solana contact-match test can only succeed
// via the `toOwner` preference (asserts the documented behavior).
const solSendTx = {
	component: 'solana',
	token: SOLANA_TOKEN,
	transaction: {
		id: 'sol-1',
		type: 'send',
		signature: 'sig-1',
		from: mockAtaAddress,
		fromOwner: mockSolAddress,
		to: mockAtaAddress2,
		toOwner: mockSolAddress2,
		value: 100n,
		status: 'finalized',
		timestamp: ZERO
	}
} as unknown as AllTransactionUiWithCmp;

const allTxs: AllTransactionUiWithCmp[] = [
	btcSendTx,
	btcReceiveTx,
	ethSendTx,
	icpSendToHexTx,
	icpApproveTx,
	solSendTx
];

describe('applyTransactionsFilter', () => {
	it('returns the same array reference when no filter is set', () => {
		const result = applyTransactionsFilter({
			transactions: allTxs,
			filter: EMPTY_TRANSACTIONS_FILTER,
			contacts: []
		});

		// Reference equality is part of the contract — the empty-filter
		// short-circuit must not allocate a copy.
		expect(result).toBe(allTxs);
	});

	describe('type filter', () => {
		it('keeps only transactions whose type is selected', () => {
			const result = applyTransactionsFilter({
				transactions: allTxs,
				filter: { ...EMPTY_TRANSACTIONS_FILTER, types: ['send'] },
				contacts: []
			});

			expect(result).toEqual([btcSendTx, ethSendTx, icpSendToHexTx, solSendTx]);
		});

		it('supports multi-type selection (OR semantics)', () => {
			const result = applyTransactionsFilter({
				transactions: allTxs,
				filter: { ...EMPTY_TRANSACTIONS_FILTER, types: ['receive', 'approve'] },
				contacts: []
			});

			expect(result).toEqual([btcReceiveTx, icpApproveTx]);
		});
	});

	describe('token filter', () => {
		it('keeps only transactions matching selected token-and-network keys', () => {
			const result = applyTransactionsFilter({
				transactions: allTxs,
				filter: {
					...EMPTY_TRANSACTIONS_FILTER,
					tokenIds: [
						transactionsFilterTokenKey(BTC_MAINNET_TOKEN),
						transactionsFilterTokenKey(ICP_TOKEN)
					].filter(nonNullish)
				},
				contacts: []
			});

			expect(result).toEqual([btcSendTx, btcReceiveTx, icpSendToHexTx, icpApproveTx]);
		});

		it('scopes by network when distinct tokens share the same token id description', () => {
			const baseEthSendTx = {
				...ethSendTx,
				token: BASE_ETH_TOKEN,
				transaction: {
					...ethSendTx.transaction,
					id: 'eth-base-send'
				}
			} as unknown as AllTransactionUiWithCmp;

			const txs: AllTransactionUiWithCmp[] = [ethSendTx, baseEthSendTx];

			const baseOnly = applyTransactionsFilter({
				transactions: txs,
				filter: {
					...EMPTY_TRANSACTIONS_FILTER,
					tokenIds: [transactionsFilterTokenKey(BASE_ETH_TOKEN)].filter(nonNullish)
				},
				contacts: []
			});

			expect(baseOnly).toEqual([baseEthSendTx]);

			const mainnetOnly = applyTransactionsFilter({
				transactions: txs,
				filter: {
					...EMPTY_TRANSACTIONS_FILTER,
					tokenIds: [transactionsFilterTokenKey(ETHEREUM_TOKEN)].filter(nonNullish)
				},
				contacts: []
			});

			expect(mainnetOnly).toEqual([ethSendTx]);
		});
	});

	describe('contact filter', () => {
		const ethContact: ContactUi = {
			name: 'Eth Friend',
			id: 1n,
			updateTimestampNs: ZERO,
			addresses: [{ address: mockEthAddress2, addressType: 'Eth' }]
		};

		const btcContact: ContactUi = {
			name: 'Btc Friend',
			id: 2n,
			updateTimestampNs: ZERO,
			addresses: [{ address: mockBtcAddress, addressType: 'Btc' }]
		};

		const solContactByOwner: ContactUi = {
			name: 'Sol Friend',
			id: 3n,
			updateTimestampNs: ZERO,
			addresses: [{ address: mockSolAddress2, addressType: 'Sol' }]
		};

		const icpPrincipalContact: ContactUi = {
			name: 'ICP Principal Friend',
			id: 4n,
			updateTimestampNs: ZERO,
			addresses: [{ address: mockPrincipalText, addressType: 'Icrcv2' }]
		};

		const allContacts: ContactUi[] = [
			ethContact,
			btcContact,
			solContactByOwner,
			icpPrincipalContact
		];

		it('matches by direct address (ETH)', () => {
			const result = applyTransactionsFilter({
				transactions: allTxs,
				filter: { ...EMPTY_TRANSACTIONS_FILTER, contactIds: ['1'] },
				contacts: allContacts
			});

			expect(result).toEqual([ethSendTx]);
		});

		it('matches BTC by sender or recipient', () => {
			const result = applyTransactionsFilter({
				transactions: allTxs,
				filter: { ...EMPTY_TRANSACTIONS_FILTER, contactIds: ['2'] },
				contacts: allContacts
			});

			expect(result).toEqual([btcSendTx, btcReceiveTx]);
		});

		it('matches Solana by owner address (not ATA)', () => {
			const result = applyTransactionsFilter({
				transactions: allTxs,
				filter: { ...EMPTY_TRANSACTIONS_FILTER, contactIds: ['3'] },
				contacts: allContacts
			});

			expect(result).toEqual([solSendTx]);
		});

		it('matches an ICP send to a derived account-id when contact has only the principal', () => {
			const result = applyTransactionsFilter({
				transactions: allTxs,
				filter: { ...EMPTY_TRANSACTIONS_FILTER, contactIds: ['4'] },
				contacts: allContacts
			});

			expect(result).toEqual([icpSendToHexTx]);
		});

		it('drops contact ids that do not exist in the contact list', () => {
			const result = applyTransactionsFilter({
				transactions: allTxs,
				filter: { ...EMPTY_TRANSACTIONS_FILTER, contactIds: ['9999'] },
				contacts: allContacts
			});

			expect(result).toEqual([]);
		});
	});

	describe('combined filters (AND across categories)', () => {
		const ethContact: ContactUi = {
			name: 'Eth Friend',
			id: 1n,
			updateTimestampNs: ZERO,
			addresses: [{ address: mockEthAddress2, addressType: 'Eth' }]
		};

		it('intersects type, token and contact', () => {
			const result = applyTransactionsFilter({
				transactions: allTxs,
				filter: {
					types: ['send'],
					tokenIds: [transactionsFilterTokenKey(ETHEREUM_TOKEN)].filter(nonNullish),
					contactIds: ['1']
				},
				contacts: [ethContact]
			});

			expect(result).toEqual([ethSendTx]);
		});

		it('returns empty when an intersection is impossible', () => {
			const result = applyTransactionsFilter({
				transactions: allTxs,
				filter: {
					types: ['receive'],
					tokenIds: [transactionsFilterTokenKey(ETHEREUM_TOKEN)].filter(nonNullish),
					contactIds: []
				},
				contacts: []
			});

			expect(result).toEqual([]);
		});
	});
});
