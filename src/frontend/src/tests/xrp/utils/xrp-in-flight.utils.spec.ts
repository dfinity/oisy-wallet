import type {
	ActiveUserTransaction,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import {
	mockLiquidiumActiveUserTransaction,
	mockNearIntentsActiveUserTransaction,
	mockXrpActiveUserTransaction,
	mockXrpData,
	mockXrpDestinationAddress,
	mockXrpSourceAddress,
	mockXrpSwapActiveUserTransaction,
	mockXrpSwapData
} from '$tests/mocks/active-user-transactions.mock';
import { xrpPaymentInFlight } from '$xrp/utils/xrp-in-flight.utils';

describe('xrp-in-flight.utils', () => {
	describe('xrpPaymentInFlight', () => {
		const withStatus = ({
			tx,
			status
		}: {
			tx: ActiveUserTransaction;
			status: ActiveUserTransactionStatus;
		}): ActiveUserTransaction => ({ ...tx, status });

		const inFlight = (transactions: ActiveUserTransaction[]) =>
			xrpPaymentInFlight({ transactions, source: mockXrpSourceAddress });

		describe('a send', () => {
			it.each([{ Pending: null }, { Executing: null }] as ActiveUserTransactionStatus[])(
				'holds its address while %o',
				(status) => {
					const send = withStatus({ tx: mockXrpActiveUserTransaction, status });

					expect(inFlight([send])).toBe(send);
				}
			);

			it.each([{ Succeeded: null }, { Failed: null }] as ActiveUserTransactionStatus[])(
				'releases its address once %o',
				(status) => {
					expect(
						inFlight([withStatus({ tx: mockXrpActiveUserTransaction, status })])
					).toBeUndefined();
				}
			);

			// Per address: a payment from another address says nothing about this one's sequence.
			it('does not hold another address', () => {
				const otherAddress = {
					...mockXrpActiveUserTransaction,
					data: { Xrp: { ...mockXrpData, source_address: mockXrpDestinationAddress } }
				};

				expect(inFlight([otherAddress])).toBeUndefined();
			});
		});

		describe('a swap from XRP', () => {
			// `Pending` is a deposit that has not resolved on the ledger yet.
			it('holds its address while Pending', () => {
				expect(inFlight([mockXrpSwapActiveUserTransaction])).toBe(mockXrpSwapActiveUserTransaction);
			});

			// `Executing` means the deposit validated; the swap goes on at 1Click without the address.
			it.each([
				{ Executing: null },
				{ Succeeded: null },
				{ Failed: null }
			] as ActiveUserTransactionStatus[])('releases its address once %o', (status) => {
				expect(
					inFlight([withStatus({ tx: mockXrpSwapActiveUserTransaction, status })])
				).toBeUndefined();
			});

			it('does not hold another address', () => {
				const otherAddress: ActiveUserTransaction = {
					...mockXrpSwapActiveUserTransaction,
					data: {
						NearIntents: {
							...mockXrpSwapData,
							source_address: [mockXrpDestinationAddress] as [string]
						}
					}
				};

				expect(inFlight([otherAddress])).toBeUndefined();
			});
		});

		// A swap from any other chain makes no XRP payment, so it names no XRP address.
		it('ignores a swap from another chain', () => {
			expect(inFlight([mockNearIntentsActiveUserTransaction])).toBeUndefined();
		});

		it('ignores records from other flows', () => {
			expect(inFlight([mockLiquidiumActiveUserTransaction])).toBeUndefined();
		});

		it('finds the open payment among others', () => {
			expect(
				inFlight([
					mockLiquidiumActiveUserTransaction,
					withStatus({ tx: mockXrpActiveUserTransaction, status: { Succeeded: null } }),
					mockXrpSwapActiveUserTransaction
				])
			).toBe(mockXrpSwapActiveUserTransaction);
		});
	});
});
