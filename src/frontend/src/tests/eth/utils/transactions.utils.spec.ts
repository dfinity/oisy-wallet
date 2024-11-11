import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { OptionEthAddress } from '$lib/types/address';
import type { Transaction } from '$lib/types/transaction';

const transaction: Transaction = {
	blockNumber: 123456,
	from: '0x1234',
	to: '0xabcd',
	timestamp: 1670000000,
	nonce: 1,
	gasLimit: ZERO,
	value: ZERO,
	chainId: 1
};

const ckMinterInfoAddresses: OptionEthAddress[] = ['0xffff'];

const $ethAddress: OptionEthAddress = '0xffff';

describe('mapEthTransactionUi', () => {
	it('should map to "withdraw" when the "from" address is in ckMinterInfoAddresses', () => {
		const ckMinterInfoAddresses: OptionEthAddress[] = ['0x1234'];

		const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, $ethAddress });

		expect(result.uiType).toBe('withdraw');
	});

	it('should map to "deposit" when the "to" address is in ckMinterInfoAddresses', () => {
		const ckMinterInfoAddresses: OptionEthAddress[] = ['0xabcd'];

		const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, $ethAddress });

		expect(result.uiType).toBe('deposit');
	});

	it('should map to "send" when the "from" address matches the $ethAddress', () => {
		const result = mapEthTransactionUi({
			transaction,
			ckMinterInfoAddresses,
			$ethAddress: '0x1234'
		});

		expect(result.uiType).toBe('send');
	});

	it('should map to "receive" when none of the other conditions match', () => {
		const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, $ethAddress });

		expect(result.uiType).toBe('receive');
	});

	it('should map to "receive" when it does not match MinterInfoAddresses and $ethAddress is undefined', () => {
		const result = mapEthTransactionUi({
			transaction,
			ckMinterInfoAddresses,
			$ethAddress: undefined
		});

		expect(result.uiType).toBe('receive');
	});

	it('should not map to "withdraw" or to "deposit" when the MinterInfoAddresses are empty', () => {
		const ckMinterInfoAddresses: OptionEthAddress[] = [];

		const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, $ethAddress });

		expect(result.uiType).not.toBe('withdraw');
		expect(result.uiType).not.toBe('deposit');
	});

	it('should not map to "withdraw" or to "deposit" when the MinterInfoAddresses are undefined', () => {
		const ckMinterInfoAddresses: OptionEthAddress[] = [undefined];

		const result = mapEthTransactionUi({
			transaction,
			ckMinterInfoAddresses,
			$ethAddress: undefined
		});

		expect(result.uiType).not.toBe('withdraw');
		expect(result.uiType).not.toBe('deposit');
	});

	it('should map an ID to the transaction hash if it exists', () => {
		const result = mapEthTransactionUi({
			transaction: { ...transaction, hash: '0x1234' },
			ckMinterInfoAddresses,
			$ethAddress
		});

		expect(result.id).toBe('0x1234');
	});

	it('should map an ID to undefined if the transaction hash does not exist', () => {
		const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, $ethAddress });

		expect(result.id).toBeUndefined;
	});
});
