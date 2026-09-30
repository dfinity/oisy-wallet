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
import {
	isXrpPaymentInFlight,
	xrpPaymentInFlight,
	xrpPaymentSettledStatus
} from '$xrp/utils/xrp-in-flight.utils';

describe('xrp-in-flight.utils', () => {
	const withStatus = ({
		tx,
		status
	}: {
		tx: ActiveUserTransaction;
		status: ActiveUserTransactionStatus;
	}): ActiveUserTransaction => ({ ...tx, status });

	describe('isXrpPaymentInFlight', () => {
		it.each([{ Pending: null }, { Executing: null }] as ActiveUserTransactionStatus[])(
			'is true for a send while %o',
			(status) => {
				expect(
					isXrpPaymentInFlight(withStatus({ tx: mockXrpActiveUserTransaction, status }))
				).toBeTruthy();
			}
		);

		it.each([{ Succeeded: null }, { Failed: null }] as ActiveUserTransactionStatus[])(
			'is false for a send once %o',
			(status) => {
				expect(
					isXrpPaymentInFlight(withStatus({ tx: mockXrpActiveUserTransaction, status }))
				).toBeFalsy();
			}
		);

		it('is true for a swap from XRP while Pending', () => {
			expect(isXrpPaymentInFlight(mockXrpSwapActiveUserTransaction)).toBeTruthy();
		});

		// From `Executing` the swap belongs to the NEAR Intents poller, not to the XRP ledger resolution.
		it.each([
			{ Executing: null },
			{ Succeeded: null },
			{ Failed: null }
		] as ActiveUserTransactionStatus[])('is false for a swap from XRP once %o', (status) => {
			expect(
				isXrpPaymentInFlight(withStatus({ tx: mockXrpSwapActiveUserTransaction, status }))
			).toBeFalsy();
		});

		it('is false for a Pending swap from another chain', () => {
			expect(mockNearIntentsActiveUserTransaction.status).toEqual({ Pending: null });

			expect(isXrpPaymentInFlight(mockNearIntentsActiveUserTransaction)).toBeFalsy();
		});

		it('is false for a record from another flow', () => {
			expect(isXrpPaymentInFlight(mockLiquidiumActiveUserTransaction)).toBeFalsy();
		});
	});

	describe('xrpPaymentSettledStatus', () => {
		it('ends a send as Succeeded', () => {
			expect(xrpPaymentSettledStatus(mockXrpActiveUserTransaction)).toEqual({ Succeeded: null });
		});

		// A validated deposit is not a swapped amount: 1Click still has to deliver it.
		it('moves a swap from XRP to Executing', () => {
			expect(xrpPaymentSettledStatus(mockXrpSwapActiveUserTransaction)).toEqual({
				Executing: null
			});
		});
	});

	describe('xrpPaymentInFlight', () => {
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
