import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsErrorNoTrace } from '$lib/stores/toasts.store';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

// How deep to follow `cause` / `error` / `info` before giving up. A provider wraps the node's own
// error two or three levels down, and no shape we have seen goes deeper than that.
const MAX_ERROR_DEPTH = 5;

// The node refuses a transaction the account cannot pay for in two different ways, both delivered
// as JSON-RPC -32000.
//
// "gas required exceeds allowance (N)" is the one that reads as a gas problem and is not: N is
// `(balance - value) / maxFeePerGas`, the gas the balance left over can still buy, so the message
// says the balance is short. It is matched as a whole phrase because an ERC-20 transfer reverts
// with "transfer amount exceeds allowance" about an approval, which is a different failure with a
// different fix and must not borrow this text.
const INSUFFICIENT_BALANCE_PATTERN = /insufficient funds|gas required exceeds allowance/i;

const ETHERS_INSUFFICIENT_FUNDS_CODE = 'INSUFFICIENT_FUNDS';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	nonNullish(value) && typeof value === 'object';

/**
 * The messages and error codes an error carries, its own and those of every error it wraps.
 *
 * Ethers nests the node's answer under `error` and `info`, and re-serialises it into its own
 * message on the way out, so the same failure can be described at several levels at once. Reading
 * all of them means a match does not depend on which level a given provider chose to wrap.
 */
const collectErrorText = ({ err, depth = 0 }: { err: unknown; depth?: number }): string[] => {
	if (typeof err === 'string') {
		return [err];
	}

	if (depth > MAX_ERROR_DEPTH || !isRecord(err)) {
		return [];
	}

	const { message, shortMessage, code, cause, error, info } = err;

	return [
		...(typeof message === 'string' ? [message] : []),
		...(typeof shortMessage === 'string' ? [shortMessage] : []),
		...(typeof code === 'string' ? [code] : []),
		...collectErrorText({ err: cause, depth: depth + 1 }),
		...collectErrorText({ err: error, depth: depth + 1 }),
		...collectErrorText({ err: info, depth: depth + 1 })
	];
};

const isInsufficientBalanceError = (err: unknown): boolean =>
	collectErrorText({ err }).some(
		(text) => text === ETHERS_INSUFFICIENT_FUNDS_CODE || INSUFFICIENT_BALANCE_PATTERN.test(text)
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
