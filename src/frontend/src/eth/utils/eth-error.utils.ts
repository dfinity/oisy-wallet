import { infuraProviders } from '$eth/providers/infura.providers';
import {
	trackEthTransactionSendOutOfGas,
	type EthTransactionSendContext
} from '$eth/services/eth-transaction-send-analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsErrorNoTrace } from '$lib/stores/toasts.store';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { Transaction } from 'ethers/transaction';
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

// The node simulates a transaction before it takes it, and refuses one that runs out of the gas it
// was signed with. Base words it "out of gas: gas required exceeds: N", N being that very limit, so
// the answer says the estimate fell short but not by how much. The refusal does not mean the
// transaction went nowhere: another node can still mine it, and then it reverts, its fee spent.
const OUT_OF_GAS_PATTERN = /out of gas/i;

// The request ethers attaches to the error carries the signed transaction it tried to broadcast.
const SEND_RAW_TRANSACTION_METHOD = 'eth_sendRawTransaction';

const SIGNED_TRANSACTION_PATTERN = /^0x[0-9a-f]+$/i;

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

interface NodeAnswer {
	code: number;
	message: string;
}

const findNodeOutOfGasAnswer = (err: unknown): NodeAnswer | undefined => {
	const answer = collectErrorRecords({ err }).find(
		({ code, message }) =>
			code === JSON_RPC_SERVER_ERROR_CODE &&
			typeof message === 'string' &&
			OUT_OF_GAS_PATTERN.test(message) &&
			!EXECUTION_REVERTED_PATTERN.test(message)
	);

	return nonNullish(answer)
		? { code: JSON_RPC_SERVER_ERROR_CODE, message: `${answer.message}` }
		: undefined;
};

const requestedSignedTransaction = ({ payload }: Record<string, unknown>): unknown =>
	isRecord(payload) &&
	payload.method === SEND_RAW_TRANSACTION_METHOD &&
	Array.isArray(payload.params)
		? (payload.params as unknown[])[0]
		: undefined;

const findSignedTransaction = (err: unknown): string | undefined =>
	collectErrorRecords({ err })
		.map(requestedSignedTransaction)
		.find(
			(candidate): candidate is string =>
				typeof candidate === 'string' && SIGNED_TRANSACTION_PATTERN.test(candidate)
		);

const decodeSignedTransaction = (signedTransaction: string): Transaction | undefined => {
	try {
		return Transaction.from(signedTransaction);
	} catch {
		return undefined;
	}
};

// The node only says the gas the transaction was signed with fell short, so the gas it needs is
// asked again, against the state as it is now. Best effort: when it fails, the toast shows without
// it. And untracked: `safeEstimateGas` reports a failure with the raw error, and ethers writes the
// transaction it estimated into that error's message, sender and calldata included.
const estimateGasNeeded = async ({
	transaction: { from, to, data, value },
	token: {
		network: { id: networkId }
	}
}: {
	transaction: Transaction;
	token: Token;
}): Promise<bigint | undefined> => {
	if (isNullish(from) || isNullish(to)) {
		return;
	}

	try {
		return await infuraProviders(networkId).estimateGas({ from, to, data, value });
	} catch {
		return undefined;
	}
};

const toastOutOfGasError = async ({
	err,
	answer,
	token,
	context
}: {
	err: unknown;
	answer: NodeAnswer;
	token: Token;
	context: EthTransactionSendContext;
}) => {
	const signedTransaction = findSignedTransaction(err);
	const transaction = nonNullish(signedTransaction)
		? decodeSignedTransaction(signedTransaction)
		: undefined;

	const gasSent = transaction?.gasLimit;
	const gasNeeded = nonNullish(transaction)
		? await estimateGasNeeded({ transaction, token })
		: undefined;

	const {
		lang,
		send: { error }
	} = get(i18n);

	const formatGas = (gas: bigint): string => new Intl.NumberFormat(lang).format(gas);

	const gasLine = nonNullish(gasSent)
		? nonNullish(gasNeeded)
			? replacePlaceholders(error.ethereum_out_of_gas_gas, {
					$gasSent: formatGas(gasSent),
					$gasNeeded: formatGas(gasNeeded)
				})
			: replacePlaceholders(error.ethereum_out_of_gas_gas_sent, { $gasSent: formatGas(gasSent) })
		: undefined;

	const transactionLine = nonNullish(signedTransaction)
		? replacePlaceholders(error.ethereum_signed_transaction, { $transaction: signedTransaction })
		: undefined;

	// The figures and the signed transaction are there for the user to screenshot or copy and hand to
	// support. Each sits on a line of its own, without a blank line before it: in a toast that shows
	// little more than two lines, a blank one reads as the end of the message.
	toastsErrorNoTrace({
		msg: {
			text: [error.ethereum_out_of_gas, gasLine, transactionLine].filter(nonNullish).join('<br>'),
			renderAsHtml: true
		},
		err
	});

	trackEthTransactionSendOutOfGas({
		context,
		token,
		gasSent,
		gasNeeded,
		errorCode: answer.code,
		nodeMessage: answer.message
	});
};

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
 *
 * A transaction that ran out of gas is explained too, with the gas it was signed with and the gas it
 * needs, and the signed transaction itself in place of the dump that carries it. It is also
 * tracked, as the flow it failed in (`context`) and the token it sent. Its toast follows a moment
 * later, once the gas needed has been asked of the network.
 */
export const toastEthereumTransactionError = ({
	err,
	fallbackMsg,
	token,
	context
}: {
	err: unknown;
	fallbackMsg: string;
	token: Token;
	context: EthTransactionSendContext;
}) => {
	const msg = mapEthereumErrorMsg(err);

	if (nonNullish(msg)) {
		toastsErrorNoTrace({ msg: { text: msg }, err });
		return;
	}

	const outOfGasAnswer = findNodeOutOfGasAnswer(err);

	if (nonNullish(outOfGasAnswer)) {
		// Never rejects: every step that can fail is caught, and the toast shows regardless.
		toastOutOfGasError({ err, answer: outOfGasAnswer, token, context });
		return;
	}

	toastsError({ msg: { text: fallbackMsg }, err });
};
