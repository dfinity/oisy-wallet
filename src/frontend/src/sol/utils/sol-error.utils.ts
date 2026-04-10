import { i18n } from '$lib/stores/i18n.store';
import { nonNullish } from '@dfinity/utils';
import {
	isSolanaError,
	SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
	SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
	SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS,
	SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
	SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
	type SolanaErrorCode
} from '@solana/kit';
import { get } from 'svelte/store';

const SPL_TOKEN_ERROR_INSUFFICIENT_FUNDS = 1;

const getErrorChain = (err: unknown): Error[] =>
	err instanceof Error ? [err, ...getErrorChain(err.cause)] : [];

const findSolanaErrorInChain = ({ err, code }: { err: unknown; code: SolanaErrorCode }): boolean =>
	getErrorChain(err).some((e) => isSolanaError(e, code));

const logsFromSolanaError = (e: Error): string[] | undefined => {
	if (!isSolanaError(e)) {
		return;
	}

	const { context } = e;

	if ('logs' in context && Array.isArray(context.logs)) {
		return context.logs;
	}
};

const extractProgramLogs = (err: unknown): string[] | undefined =>
	getErrorChain(err).map(logsFromSolanaError).find(nonNullish);

/**
 * Detects an "insufficient funds" condition from a Solana error chain.
 *
 * Covers the native InsufficientFunds instruction error, the SPL Token program
 * custom error 0x1, and a fallback log-based heuristic.
 */
const isInsufficientFundsError = (err: unknown): boolean =>
	findSolanaErrorInChain({
		err,
		code: SOLANA_ERROR__INSTRUCTION_ERROR__INSUFFICIENT_FUNDS
	}) ||
	getErrorChain(err).some(
		(e) =>
			isSolanaError(e, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM) &&
			'code' in e.context &&
			e.context.code === SPL_TOKEN_ERROR_INSUFFICIENT_FUNDS
	) ||
	(extractProgramLogs(err)?.some((log) => /insufficient funds/i.test(log)) ?? false);

const isInsufficientFundsForFeeError = (err: unknown): boolean =>
	findSolanaErrorInChain({
		err,
		code: SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE
	}) ||
	findSolanaErrorInChain({
		err,
		code: SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT
	});

/**
 * Maps a Solana error to a user-friendly error message.
 *
 * Resolves i18n strings imperatively so callers don't need to pass them.
 * Returns `undefined` when the error is not a recognised Solana error, allowing
 * callers to fall through to their own default/generic message.
 */
export const mapSolanaErrorMsg = (err: unknown): string | undefined => {
	if (!isSolanaError(err)) {
		return;
	}

	const {
		send: { error }
	} = get(i18n);

	if (isSolanaError(err, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)) {
		return error.solana_transaction_expired;
	}

	if (isInsufficientFundsError(err)) {
		return error.solana_insufficient_funds;
	}

	if (isInsufficientFundsForFeeError(err)) {
		return error.solana_insufficient_funds_for_fee;
	}
};
