import BtcSendWarnings from '$btc/components/send/BtcSendWarnings.svelte';
import { BtcPendingSentTransactionsStatus } from '$btc/derived/btc-pending-sent-transactions-status.derived';
import { BtcPrepareSendError, BtcSendValidationError, type UtxosFee } from '$btc/types/btc-send';
import { mockUtxo } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('BtcSendWarnings', () => {
	const mockUtxosFee: UtxosFee = {
		feeSatoshis: 1000n,
		utxos: [mockUtxo]
	};

	describe('pending transactions status warnings', () => {
		it('should show pending transaction warning when status is SOME', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.SOME,
					utxosFee: mockUtxosFee
				}
			});

			expect(container).toHaveTextContent(en.send.info.pending_bitcoin_transaction);
		});

		it('should show error warning when status is ERROR', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.ERROR,
					utxosFee: mockUtxosFee
				}
			});

			expect(container).toHaveTextContent(en.send.error.no_pending_bitcoin_transaction);
		});

		it('should not show any warning when status is NONE', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: mockUtxosFee
				}
			});

			expect(container).not.toHaveTextContent(en.send.info.pending_bitcoin_transaction);
			expect(container).not.toHaveTextContent(en.send.error.no_pending_bitcoin_transaction);
		});

		it('should not show any warning when status is LOADING', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.LOADING,
					utxosFee: mockUtxosFee
				}
			});

			expect(container).not.toHaveTextContent(en.send.info.pending_bitcoin_transaction);
			expect(container).not.toHaveTextContent(en.send.error.no_pending_bitcoin_transaction);
		});
	});

	describe('BtcPrepareSendError warnings', () => {
		it('should show insufficient funds warning for InsufficientBalance error', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcPrepareSendError.InsufficientBalance
					}
				}
			});

			expect(container).toHaveTextContent(en.send.assertion.insufficient_funds);
		});

		it('should show insufficient funds for fee warning for InsufficientBalanceForFee error', () => {
			const { getByTestId } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcPrepareSendError.InsufficientBalanceForFee
					}
				}
			});

			expect(getByTestId('btc-send-form-insufficient-funds-for-fee')).toHaveTextContent(
				en.fee.assertion.insufficient_funds_for_fee
			);
		});

		it('should show UTXO locked warning for UtxoLocked error', () => {
			const { getByTestId } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcPrepareSendError.UtxoLocked
					}
				}
			});

			expect(getByTestId('btc-send-form-utxos-locked')).toHaveTextContent(
				en.send.assertion.btc_utxo_locked
			);
		});

		it('should show pending transactions not available warning for PendingTransactionsNotAvailable error', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcPrepareSendError.PendingTransactionsNotAvailable
					}
				}
			});

			expect(container).toHaveTextContent(en.send.assertion.pending_transactions_not_available);
		});

		it('should show minimum BTC amount warning for MinimumBalance error', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcPrepareSendError.MinimumBalance
					}
				}
			});

			expect(container).toHaveTextContent(en.send.assertion.minimum_btc_amount);
		});
	});

	describe('BtcSendValidationError warnings', () => {
		it('should show pending transactions not available warning for PendingTransactionsNotAvailable error', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcSendValidationError.PendingTransactionsNotAvailable
					}
				}
			});

			expect(container).toHaveTextContent(en.send.assertion.pending_transactions_not_available);
		});

		it('should show invalid UTXO data warning for InvalidUtxoData error', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcSendValidationError.InvalidUtxoData
					}
				}
			});

			expect(container).toHaveTextContent(en.send.assertion.btc_invalid_utxo_data);
		});

		it('should show UTXO locked warning for UtxoLocked error', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcSendValidationError.UtxoLocked
					}
				}
			});

			expect(container).toHaveTextContent(en.send.assertion.btc_utxo_locked);
		});

		it('should show invalid fee calculation warning for InvalidFeeCalculation error', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcSendValidationError.InvalidFeeCalculation
					}
				}
			});

			expect(container).toHaveTextContent(en.send.assertion.btc_invalid_fee_calculation);
		});

		it('should show UTXO fee missing warning for UtxoFeeMissing error', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcSendValidationError.UtxoFeeMissing
					}
				}
			});

			expect(container).toHaveTextContent(en.send.assertion.utxos_fee_missing);
		});

		it('should show invalid destination warning for InvalidDestination error', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcSendValidationError.InvalidDestination
					}
				}
			});

			expect(container).toHaveTextContent(en.send.assertion.destination_address_invalid);
		});

		it('should show invalid amount warning for InvalidAmount error', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						...mockUtxosFee,
						error: BtcSendValidationError.InvalidAmount
					}
				}
			});

			expect(container).toHaveTextContent(en.send.assertion.amount_invalid);
		});
	});

	describe('empty UTXOs warning', () => {
		it('should show no available UTXOs warning when utxos array is empty', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: {
						feeSatoshis: 1000n,
						utxos: []
					}
				}
			});

			expect(container).toHaveTextContent(en.send.info.no_available_utxos);
		});

		it('should not show no available UTXOs warning when utxos array has items', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: mockUtxosFee
				}
			});

			expect(container).not.toHaveTextContent(en.send.info.no_available_utxos);
		});
	});

	describe('no warnings', () => {
		it('should not show any warning when all conditions are good', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: mockUtxosFee
				}
			});

			expect(container.querySelector('[class*="warning"]')).toBeNull();
		});

		it('should not show any warning when utxosFee is undefined', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.NONE,
					utxosFee: undefined
				}
			});

			expect(container.querySelector('[class*="warning"]')).toBeNull();
		});
	});

	describe('warning priority', () => {
		it('should prioritize pending transaction status over utxosFee errors', () => {
			const { container } = render(BtcSendWarnings, {
				props: {
					pendingTransactionsStatus: BtcPendingSentTransactionsStatus.SOME,
					utxosFee: {
						...mockUtxosFee,
						error: BtcPrepareSendError.InsufficientBalance
					}
				}
			});

			expect(container).toHaveTextContent(en.send.info.pending_bitcoin_transaction);
			expect(container).not.toHaveTextContent(en.send.assertion.insufficient_funds);
		});
	});
});
