import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsErrorNoTrace } from '$lib/stores/toasts.store';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

// How deep to follow `cause` / `error` / `info` before giving up. A provider wraps the node's own
// error two or three levels down, and no shape we have seen goes deeper than that.
const MAX_ERROR_DEPTH = 5;

// The node refuses a transaction the account cannot pay for in two different ways, both delivered
// as a JSON-RPC -32000.
//
// "gas required exceeds allowance (N)" is the one that reads as a gas problem and is not: N is
// `(balance - value) / maxFeePerGas`, the gas the balance left over can still buy, so the message
// says the balance is short. It is matched as a whole phrase because an ERC-20 transfer reverts
// with "transfer amount exceeds allowance" about an approval, which is a different failure with a
// different fix and must not borrow this text.
const INSUFFICIENT_BALANCE_PATTERN = /insufficient funds|gas required exceeds allowance/i;

const JSON_RPC_SERVER_ERROR_CODE = -32000;

// Older nodes answer a reverting call with -32000 as well, the contract's reason in the message.
const EXECUTION_REVERTED_PATTERN = /execution reverted/i;

// Ethers' own verdict that the node refused the account. It never gives this code to a revert,
// which it reports as `CALL_EXCEPTION`.
const ETHERS_INSUFFICIENT_FUNDS_CODE = 'INSUFFICIENT_FUNDS';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	nonNullish(value) && typeof value === 'object';

/**
 * The error itself and every error it wraps.
 *
 * Ethers nests the node's answer under `error` and `info`, and a caller may wrap the whole thing in
 * a `cause`. Records are kept whole rather than flattened into their messages: a message only means
 * something next to the code of the record that carried it.
 */
const collectErrorRecords = ({
	err,
	depth = 0
}: {
	err: unknown;
	depth?: number;
}): Record<string, unknown>[] => {
	if (depth > MAX_ERROR_DEPTH || !isRecord(err)) {
		return [];
	}

	const { cause, error, info } = err;

	return [
		err,
		...collectErrorRecords({ err: cause, depth: depth + 1 }),
		...collectErrorRecords({ err: error, depth: depth + 1 }),
		...collectErrorRecords({ err: info, depth: depth + 1 })
	];
};

// Only the node's own answer is read for these phrases. The same words can turn up anywhere else in
// the chain: in the message ethers re-serialises around it, or in a contract's revert reason, where
// they are the contract refusing the call and say nothing about whether the account can pay for gas.
const isNodeInsufficientBalanceAnswer = ({ code, message }: Record<string, unknown>): boolean =>
	code === JSON_RPC_SERVER_ERROR_CODE &&
	typeof message === 'string' &&
	INSUFFICIENT_BALANCE_PATTERN.test(message) &&
	!EXECUTION_REVERTED_PATTERN.test(message);

const isInsufficientBalanceError = (err: unknown): boolean =>
	collectErrorRecords({ err }).some(
		(record) =>
			record.code === ETHERS_INSUFFICIENT_FUNDS_CODE || isNodeInsufficientBalanceAnswer(record)
	);

/**
 * Maps an error raised while broadcasting an Ethereum or EVM transaction to a user-friendly message.
 *
 * Resolves i18n strings imperatively so callers don't need to pass them. Returns `undefined` when
 * the error is not one we can explain, allowing callers to fall through to their own generic
 * message rather than claiming a cause we have not established.
 */
export const mapEthereumErrorMsg = (err: unknown): string | undefined => {
	const {
		send: { error }
	} = get(i18n);

	if (isInsufficientBalanceError(err)) {
		return error.ethereum_insufficient_funds;
	}
};

/**
 * Reports an error raised while broadcasting a transaction, with the node's own text attached only
 * when we have no explanation of our own to offer.
 *
 * A recognised cause is already stated in terms the user can act on, and appending the RPC dump to
 * it would bury that under the very string that makes these failures read as something they are
 * not. `toastsErrorNoTrace` still writes the original error to the console, so nothing is lost for
 * whoever has to diagnose it. An unexplained failure keeps the detail on screen, it being the only
 * thing there is to report.
 */
export const toastEthereumTransactionError = ({
	err,
	fallbackMsg
}: {
	err: unknown;
	fallbackMsg: string;
}) => {
	const msg = mapEthereumErrorMsg(err);

	if (nonNullish(msg)) {
		toastsErrorNoTrace({ msg: { text: msg }, err });
		return;
	}

	toastsError({ msg: { text: fallbackMsg }, err });
};
