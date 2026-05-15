import {
	CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS,
	UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
} from '$btc/constants/btc.constants';
import type { BtcTransactionStatus } from '$btc/types/btc';
import { mapBtcTransaction, sortBtcTransactions } from '$btc/utils/btc-transactions.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { BitcoinInput, BitcoinOutput, BitcoinTransaction } from '$lib/types/blockchain';
import {
	mockBtcTransaction,
	mockBtcTransactionUi
} from '$tests/mocks/blockchain-transactions.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { nonNullish } from '@dfinity/utils';

describe('mapBtcTransaction', () => {
	const otherAddress = 'bc1q3jlulk7pw9p5tjqcrwdec9a6vdaw9pqhw0wg4g';

	const sendTransaction = {
		...mockBtcTransaction,
		inputs: [
			{
				...mockBtcTransaction.inputs[0],
				prev_out: {
					...mockBtcTransaction.inputs[0].prev_out,
					addr: mockBtcAddress
				}
			}
		]
	} as BitcoinTransaction;

	// Under the net-flow algorithm: value is what actually went to other recipients,
	// fee is the user's share of the network fee (rawNet - sendAmount).
	const sendTransactionValue = 202173397n;
	const sendTransactionFee = 1019n;
	const sendRecipients = mockBtcTransaction.out
		.map(({ addr }) => addr)
		.filter((addr) => addr !== mockBtcAddress);

	describe('status / confirmations', () => {
		it('marks the transaction as pending when there is no block_index', () => {
			const result = mapBtcTransaction({
				transaction: mockBtcTransaction,
				btcAddress: mockBtcAddress,
				latestBitcoinBlockHeight: 1
			});

			expect(result).toEqual({
				...mockBtcTransactionUi,
				blockNumber: undefined,
				confirmations: undefined,
				status: 'pending'
			});
		});

		it('marks the transaction as unconfirmed below the confirmation threshold', () => {
			const transaction = {
				...mockBtcTransaction,
				block_index: mockBtcTransactionUi.blockNumber
			} as BitcoinTransaction;
			const result = mapBtcTransaction({
				transaction,
				btcAddress: mockBtcAddress,
				latestBitcoinBlockHeight:
					(mockBtcTransactionUi.blockNumber ?? 0) + UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
			});

			expect(result).toEqual({
				...mockBtcTransactionUi,
				status: 'unconfirmed',
				confirmations: UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS + 1
			});
		});

		it('marks the transaction as confirmed at or above the confirmation threshold', () => {
			const transaction = {
				...mockBtcTransaction,
				block_index: mockBtcTransactionUi.blockNumber
			} as BitcoinTransaction;
			const result = mapBtcTransaction({
				transaction,
				btcAddress: mockBtcAddress,
				latestBitcoinBlockHeight:
					(mockBtcTransactionUi.blockNumber ?? 0) + CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
			});

			expect(result).toEqual({
				...mockBtcTransactionUi,
				confirmations: CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS + 1
			});
		});

		it('maps a send transaction with the user as the sole input', () => {
			const transaction = {
				...sendTransaction,
				block_index: mockBtcTransactionUi.blockNumber
			} as BitcoinTransaction;
			const result = mapBtcTransaction({
				transaction,
				btcAddress: mockBtcAddress,
				latestBitcoinBlockHeight:
					(mockBtcTransactionUi.blockNumber ?? 0) + CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
			});

			expect(result).toEqual({
				...mockBtcTransactionUi,
				from: mockBtcAddress,
				to: sendRecipients,
				value: sendTransactionValue,
				fee: sendTransactionFee,
				type: 'send',
				confirmations: CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS + 1
			});
		});
	});

	describe('net-flow value / fee', () => {
		const [baseInput] = mockBtcTransaction.inputs;
		const [baseOutput] = mockBtcTransaction.out;

		const isPositive = (n: number | undefined): n is number => nonNullish(n) && n > 0;

		const makeInput = ({ value, addr }: { value: number; addr: string }): BitcoinInput => ({
			...baseInput,
			prev_out: { ...baseInput.prev_out, addr, value }
		});

		const makeOutput = ({ value, addr }: { value: number; addr: string }): BitcoinOutput => ({
			...baseOutput,
			addr,
			value
		});

		const buildTransaction = ({
			inOthers,
			inMe,
			outOthers,
			outMe
		}: {
			inOthers?: number;
			inMe?: number;
			outOthers?: number;
			outMe?: number;
		}): BitcoinTransaction => ({
			...mockBtcTransaction,
			inputs: [
				...(isPositive(inOthers) ? [makeInput({ value: inOthers, addr: otherAddress })] : []),
				...(isPositive(inMe) ? [makeInput({ value: inMe, addr: mockBtcAddress })] : [])
			],
			out: [
				...(isPositive(outOthers) ? [makeOutput({ value: outOthers, addr: otherAddress })] : []),
				...(isPositive(outMe) ? [makeOutput({ value: outMe, addr: mockBtcAddress })] : [])
			]
		});

		// Test matrix from the algorithm specification.
		// Each row: { name, inputs, outputs, expected type/value/fee }.
		// `value` is BTC the user "sent" (for send) or "received" (for receive).
		// `fee` is the user's share of the network fee; undefined on receive.
		const cases: {
			name: string;
			inOthers?: number;
			inMe?: number;
			outOthers?: number;
			outMe?: number;
			type: 'send' | 'receive';
			value: bigint;
			fee?: bigint;
		}[] = [
			{ name: 'Receive', inOthers: 10, outOthers: 7, outMe: 2, type: 'receive', value: 2n },
			{ name: 'Send', inMe: 10, outOthers: 9, type: 'send', value: 9n, fee: 1n },
			{
				name: 'Multi Send (send with return)',
				inMe: 10,
				outOthers: 2,
				outMe: 5,
				type: 'send',
				value: 2n,
				fee: 3n
			},
			{ name: 'Self Send', inMe: 10, outMe: 9, type: 'send', value: ZERO, fee: 1n },
			{
				name: 'Combi Send',
				inOthers: 5,
				inMe: 5,
				outOthers: 9,
				type: 'send',
				value: 5n,
				fee: ZERO
			},
			{
				name: 'Combi Send (cap)',
				inOthers: 5,
				inMe: 5,
				outOthers: 1,
				type: 'send',
				value: 1n,
				fee: 4n
			},
			{
				name: 'Combi Self Send (<)',
				inOthers: 5,
				inMe: 5,
				outMe: 3,
				type: 'send',
				value: ZERO,
				fee: 2n
			},
			{
				name: 'Combi Self Send (=)',
				inOthers: 5,
				inMe: 5,
				outMe: 5,
				type: 'send',
				value: ZERO,
				fee: ZERO
			},
			{
				name: 'Combi Self Send (>)',
				inOthers: 5,
				inMe: 5,
				outMe: 7,
				type: 'receive',
				value: 2n
			},
			{
				name: 'Combi Multi Send (<)',
				inOthers: 5,
				inMe: 5,
				outOthers: 4,
				outMe: 4,
				type: 'send',
				value: 1n,
				fee: ZERO
			},
			{
				name: 'Combi Multi Send (<, cap)',
				inOthers: 5,
				inMe: 5,
				outOthers: 1,
				outMe: 3,
				type: 'send',
				value: 1n,
				fee: 1n
			},
			{
				name: 'Combi Multi Send (=)',
				inOthers: 5,
				inMe: 5,
				outOthers: 3,
				outMe: 5,
				type: 'send',
				value: ZERO,
				fee: ZERO
			},
			{
				name: 'Combi Multi Send (>)',
				inOthers: 5,
				inMe: 5,
				outOthers: 1,
				outMe: 8,
				type: 'receive',
				value: 3n
			},
			{
				name: 'Receive with sender change',
				inOthers: 5,
				outOthers: 1,
				outMe: 4,
				type: 'receive',
				value: 4n
			},
			{
				name: 'Send with return (alt amounts)',
				inMe: 10,
				outOthers: 4,
				outMe: 5,
				type: 'send',
				value: 4n,
				fee: 1n
			}
		];

		it.each(cases)('$name', ({ inOthers, inMe, outOthers, outMe, type, value, fee }) => {
			const transaction = buildTransaction({ inOthers, inMe, outOthers, outMe });

			const result = mapBtcTransaction({
				transaction,
				btcAddress: mockBtcAddress,
				latestBitcoinBlockHeight: 1
			});

			expect(result.type).toBe(type);
			expect(result.value).toBe(value);
			expect(result.fee).toBe(fee);
		});

		it('sets to = [user] and from = sender on a receive', () => {
			const transaction = buildTransaction({ inOthers: 10, outMe: 10 });

			const result = mapBtcTransaction({
				transaction,
				btcAddress: mockBtcAddress,
				latestBitcoinBlockHeight: 1
			});

			expect(result.from).toBe(otherAddress);
			expect(result.to).toEqual([mockBtcAddress]);
		});

		it('sets from = user and to = recipients on a send', () => {
			const transaction = buildTransaction({ inMe: 10, outOthers: 9 });

			const result = mapBtcTransaction({
				transaction,
				btcAddress: mockBtcAddress,
				latestBitcoinBlockHeight: 1
			});

			expect(result.from).toBe(mockBtcAddress);
			expect(result.to).toEqual([otherAddress]);
		});

		it('returns to = [self] for a pure self-consolidation', () => {
			const transaction = buildTransaction({ inMe: 10, outMe: 9 });

			const result = mapBtcTransaction({
				transaction,
				btcAddress: mockBtcAddress,
				latestBitcoinBlockHeight: 1
			});

			expect(result.from).toBe(mockBtcAddress);
			expect(result.to).toEqual([mockBtcAddress]);
		});
	});
});

describe('sortBtcTransactions', () => {
	// TODO: add more test cases
	it('sorts transactions correctly', () => {
		const pendingTransaction1 = {
			...mockBtcTransactionUi,
			timestamp: 1n,
			status: 'pending' as BtcTransactionStatus
		};
		const pendingTransaction2 = {
			...mockBtcTransactionUi,
			timestamp: 2n,
			status: 'pending' as BtcTransactionStatus
		};
		const unconfirmedTransaction1 = {
			...mockBtcTransactionUi,
			timestamp: 3n,
			status: 'unconfirmed' as BtcTransactionStatus
		};
		const unconfirmedTransaction2 = {
			...mockBtcTransactionUi,
			timestamp: 4n,
			status: 'unconfirmed' as BtcTransactionStatus
		};
		const confirmedTransaction1 = {
			...mockBtcTransactionUi,
			timestamp: 5n,
			status: 'confirmed' as BtcTransactionStatus
		};
		const confirmedTransaction2 = {
			...mockBtcTransactionUi,
			timestamp: 6n,
			status: 'confirmed' as BtcTransactionStatus
		};
		const transactionsToSort = [
			confirmedTransaction2,
			pendingTransaction1,
			unconfirmedTransaction2,
			pendingTransaction2,
			confirmedTransaction1,
			unconfirmedTransaction1
		];
		const expectedResult = [
			pendingTransaction2,
			pendingTransaction1,
			unconfirmedTransaction2,
			unconfirmedTransaction1,
			confirmedTransaction2,
			confirmedTransaction1
		];

		expect(
			transactionsToSort.sort((transactionA, transactionB) =>
				sortBtcTransactions({ transactionA, transactionB })
			)
		).toStrictEqual(expectedResult);
	});

	it('sorts on top transactions without timestamp', () => {
		const pendingTransaction1 = {
			...mockBtcTransactionUi,
			timestamp: undefined,
			status: 'pending' as BtcTransactionStatus
		};
		const pendingTransaction2 = {
			...mockBtcTransactionUi,
			timestamp: undefined,
			status: 'pending' as BtcTransactionStatus
		};
		const unconfirmedTransaction1 = {
			...mockBtcTransactionUi,
			timestamp: 3n,
			status: 'unconfirmed' as BtcTransactionStatus
		};
		const unconfirmedTransaction2 = {
			...mockBtcTransactionUi,
			timestamp: 4n,
			status: 'unconfirmed' as BtcTransactionStatus
		};
		const confirmedTransaction1 = {
			...mockBtcTransactionUi,
			timestamp: 5n,
			status: 'confirmed' as BtcTransactionStatus
		};
		const confirmedTransaction2 = {
			...mockBtcTransactionUi,
			timestamp: 6n,
			status: 'confirmed' as BtcTransactionStatus
		};
		const transactionsToSort = [
			confirmedTransaction2,
			pendingTransaction1,
			unconfirmedTransaction2,
			pendingTransaction2,
			confirmedTransaction1,
			unconfirmedTransaction1
		];
		const expectedResult = [
			pendingTransaction1,
			pendingTransaction2,
			unconfirmedTransaction2,
			unconfirmedTransaction1,
			confirmedTransaction2,
			confirmedTransaction1
		];

		expect(
			transactionsToSort.sort((transactionA, transactionB) =>
				sortBtcTransactions({ transactionA, transactionB })
			)
		).toStrictEqual(expectedResult);
	});
});
