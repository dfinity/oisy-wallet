import { mapSolanaErrorMsg } from '$sol/utils/sol-error.utils';
import en from '$tests/mocks/i18n.mock';
import { mockPreflightContext } from '$tests/mocks/sol-error.mock';
import {
	SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
	SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
	SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS,
	SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
	SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
	SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
	SolanaError
} from '@solana/kit';

describe('sol-error.utils', () => {
	const {
		send: { error: sendError }
	} = en;

	describe('mapSolanaErrorMsg', () => {
		it('returns undefined for a plain Error', () => {
			expect(mapSolanaErrorMsg(new Error('fail'))).toBeUndefined();
		});

		it('returns undefined for a non-Error value', () => {
			expect(mapSolanaErrorMsg('fail')).toBeUndefined();
			expect(mapSolanaErrorMsg(null)).toBeUndefined();
			expect(mapSolanaErrorMsg(42)).toBeUndefined();
		});

		it('maps block height exceeded to transaction expired', () => {
			const err = new SolanaError(SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED, {
				currentBlockHeight: 100n,
				lastValidBlockHeight: 90n
			});

			expect(mapSolanaErrorMsg(err)).toBe(sendError.solana_transaction_expired);
		});

		it('maps native insufficient funds instruction error', () => {
			const inner = new SolanaError(SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS, {
				index: 0
			});
			const err = new SolanaError(
				SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
				mockPreflightContext({ cause: inner })
			);

			expect(mapSolanaErrorMsg(err)).toBe(sendError.solana_insufficient_funds);
		});

		it('maps SPL token custom program error 0x1 (insufficient funds)', () => {
			const inner = new SolanaError(SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM, {
				index: 0,
				code: 1
			});
			const err = new SolanaError(
				SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
				mockPreflightContext({ cause: inner })
			);

			expect(mapSolanaErrorMsg(err)).toBe(sendError.solana_insufficient_funds);
		});

		it('does not map a custom program error with a different code as insufficient funds', () => {
			const inner = new SolanaError(SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM, {
				index: 0,
				code: 99
			});
			const err = new SolanaError(
				SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
				mockPreflightContext({ cause: inner })
			);

			expect(mapSolanaErrorMsg(err)).toBeUndefined();
		});

		it('maps insufficient funds for fee', () => {
			const inner = new SolanaError(SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE);
			const err = new SolanaError(
				SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
				mockPreflightContext({ cause: inner })
			);

			expect(mapSolanaErrorMsg(err)).toBe(sendError.solana_insufficient_funds_for_fee);
		});

		it('maps insufficient funds for rent', () => {
			const inner = new SolanaError(SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT, {
				accountIndex: 0
			});
			const err = new SolanaError(
				SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
				mockPreflightContext({ cause: inner })
			);

			expect(mapSolanaErrorMsg(err)).toBe(sendError.solana_insufficient_funds_for_fee);
		});

		it('detects insufficient funds from program logs as fallback', () => {
			const err = new SolanaError(
				SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
				mockPreflightContext({
					logs: [
						'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
						'Program log: Instruction: Transfer',
						'Program log: Error: insufficient funds'
					]
				})
			);

			expect(mapSolanaErrorMsg(err)).toBe(sendError.solana_insufficient_funds);
		});

		it('returns undefined for an unrecognised SolanaError', () => {
			const err = new SolanaError(
				SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
				mockPreflightContext({
					logs: ['Program log: something else entirely']
				})
			);

			expect(mapSolanaErrorMsg(err)).toBeUndefined();
		});
	});
});
