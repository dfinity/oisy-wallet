import { BTC_SEND_FEE_TOLERANCE_PERCENTAGE } from '$btc/constants/btc.constants';
import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
import { signAndFinalizeBtcPsbt } from '$btc/services/btc-sign.services';
import type { BtcAddress } from '$btc/types/address';
import {
	BtcBroadcastUnconfirmedError,
	BtcSendValidationError,
	BtcValidationError,
	type UtxosFee
} from '$btc/types/btc-send';
import {
	btcAddressToOutputScript,
	btcOutputVSize,
	buildBtcSendPsbt
} from '$btc/utils/btc-psbt.utils';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { calculateFeeSatoshis, extractUtxoOutpoints } from '$btc/utils/btc-utxos.utils';
import type { SendBtcResponse, SignBtcResponse } from '$declarations/signer/signer.did';
import { BTC_SEND_VIA_BACKEND_ENABLED } from '$env/btc.env';
import { getPendingTransactionUtxoOutpoints, txidStringToUint8Array } from '$icp/utils/btc.utils';
import { addPendingBtcTransaction, broadcastBtcTransaction } from '$lib/api/backend.api';
import { sendBtc as sendBtcApi, signBtc as signBtcApi } from '$lib/api/signer.api';
import { BtcBroadcastTransactionCanisterError } from '$lib/canisters/errors';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Amount } from '$lib/types/send';
import { consoleError } from '$lib/utils/console.utils';
import { extractIIDelegationChain } from '$lib/utils/delegation.utils';
import { invalidAmount } from '$lib/utils/input.utils';
import { mapBitcoinNetworkToNetworkId, mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import { isNullish, nonNullish, toNullable } from '@dfinity/utils';
import type { BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

interface CommonBtcServiceParams {
	identity: Identity;
	network: BitcoinNetwork;
	utxosFee: UtxosFee;
	destination: BtcAddress;
	onProgress?: () => void;
}

export type SendBtcParams = CommonBtcServiceParams & {
	amount: Amount;
	source: BtcAddress;
	// Runs the moment the transaction is broadcast, ahead of the pending-transaction
	// bookkeeping and the wallet refresh: the broadcast is irreversible from there, so
	// a caller that must record it (e.g. as an active user transaction) cannot wait
	// behind steps whose failure would swallow the txid.
	onBroadcast?: (params: { txid: string }) => Promise<void> | void;
	// Backend path only: runs once the transaction is signed, before it is broadcast, with the
	// txid it will have. If it rejects, nothing is broadcast and `sendBtc` rejects with its error.
	beforeBroadcast?: (params: { txid: string }) => Promise<void>;
	// Takes the backend path when `BTC_SEND_VIA_BACKEND_ENABLED` is on, for a caller that handles
	// its outcomes: a broadcast whose outcome is unclear (`isUnclearBtcBroadcastOutcome`) may have
	// gone out. Every other caller keeps the Chain Fusion Signer until it does too.
	viaBackend?: boolean;
};

export type SignBtcParams = CommonBtcServiceParams & {
	satoshisAmount: bigint;
};

// Validation errors whose handling is a uniform toast differing only by the
// i18n key. AuthenticationRequired and the unexpected fallback are kept as
// explicit special cases below, so they intentionally do not appear here.
const btcValidationErrorMessages: Partial<Record<BtcSendValidationError, ($i18n: I18n) => string>> =
	{
		[BtcSendValidationError.NoNetworkId]: ($i18n) => $i18n.send.error.no_btc_network_id,
		[BtcSendValidationError.InvalidDestination]: ($i18n) =>
			$i18n.send.assertion.destination_address_invalid,
		[BtcSendValidationError.InvalidAmount]: ($i18n) => $i18n.send.assertion.amount_invalid,
		[BtcSendValidationError.UtxoFeeMissing]: ($i18n) => $i18n.send.assertion.utxos_fee_missing,
		[BtcSendValidationError.TokenUndefined]: ($i18n) => $i18n.tokens.error.unexpected_undefined,
		[BtcSendValidationError.InsufficientBalance]: ($i18n) =>
			$i18n.send.assertion.btc_insufficient_balance,
		[BtcSendValidationError.InsufficientBalanceForFee]: ($i18n) =>
			$i18n.send.assertion.btc_insufficient_balance_for_fee,
		[BtcSendValidationError.InvalidUtxoData]: ($i18n) => $i18n.send.assertion.btc_invalid_utxo_data,
		[BtcSendValidationError.UtxoLocked]: ($i18n) => $i18n.send.assertion.btc_utxo_locked,
		[BtcSendValidationError.InvalidFeeCalculation]: ($i18n) =>
			$i18n.send.assertion.btc_invalid_fee_calculation,
		[BtcSendValidationError.MinimumBalance]: ($i18n) => $i18n.send.assertion.minimum_btc_amount
	};

/**
 * Shows a toast for a BTC validation error, mapping each error type to its message.
 *
 * Shared between the BTC Send and Convert Wizard flows. Reads the current i18n store
 * internally, so no translation strings need to be passed in. `AuthenticationRequired`
 * is silently ignored and any unmapped error type falls back to a generic toast.
 *
 * This function is synchronous and returns void.
 *
 * @param params - Object containing the validation error
 * @param params.err - The {@link BtcValidationError} to surface as a toast
 */
export const handleBtcValidationError = ({ err }: { err: BtcValidationError }) => {
	if (err.type === BtcSendValidationError.AuthenticationRequired) {
		return;
	}

	const $i18n = get(i18n);

	const message = btcValidationErrorMessages[err.type];
	if (nonNullish(message)) {
		toastsError({ msg: { text: message($i18n) } });
		return;
	}

	toastsError({
		msg: { text: $i18n.send.error.unexpected },
		err
	});
};

/**
 * Validates all aspects of the provided UTXOs before sending Bitcoin transaction
 * @param params - Object containing all validation parameters
 * @throws BtcValidationError with specific error type if any validation fails
 */
export const validateBtcSend = async ({
	utxosFee,
	source,
	destination,
	amount,
	network,
	identity
}: {
	utxosFee: UtxosFee;
	source: BtcAddress;
	// The recipient, passed exactly when the fee was priced with it: its output is then sized from
	// its script, and an address for another network is refused. Without it, as for Convert, every
	// swap and Liquidium, even where the address is known, the fee is checked against the largest
	// output a send can pay, which is how it was priced.
	destination?: BtcAddress;
	amount: Amount;
	network: BitcoinNetwork;
	identity: Identity;
}): Promise<void> => {
	if (nonNullish(utxosFee.error)) {
		// If the send button was not properly disabled during an error, we return the same error again
		throw utxosFee.error;
	}

	// 1. Validate general input parameters first before accessing any properties
	if (invalidAmount(amount)) {
		throw new BtcValidationError(BtcSendValidationError.InvalidAmount);
	}

	// An output script carries no network, so an address for another network would pay the same
	// program on this one. Refused here, before anything is signed.
	if (nonNullish(destination)) {
		try {
			btcAddressToOutputScript({ address: destination, network });
		} catch (_: unknown) {
			throw new BtcValidationError(BtcSendValidationError.InvalidDestination);
		}
	}

	const { utxos, feeSatoshis, feeRateMiliSatoshisPerVByte } = utxosFee;
	const amountSatoshis = convertNumberToSatoshis({ amount });

	if (utxos.length === 0) {
		throw new BtcValidationError(BtcSendValidationError.InsufficientBalance);
	}
	for (const utxo of utxos) {
		if (
			isNullish(utxo.outpoint) ||
			isNullish(utxo.outpoint.txid) ||
			utxo.outpoint.txid.length === 0 ||
			utxo.outpoint.vout === undefined ||
			isNullish(utxo.value) ||
			BigInt(utxo.value) <= ZERO ||
			isNullish(utxo.height) ||
			utxo.height < 0
		) {
			throw new BtcValidationError(BtcSendValidationError.InvalidUtxoData);
		}
	}

	// 2. Check if UTXOs are still unspent (not locked by pending transactions)
	// It is very important that the pending transactions are updated before validating the UTXOs
	await loadBtcPendingSentTransactions({
		identity,
		networkId: mapBitcoinNetworkToNetworkId(network), // we want to avoid having to pass redundant data to the function
		address: source
	});

	const pendingUtxoOutpoints = getPendingTransactionUtxoOutpoints(source);

	if (isNullish(pendingUtxoOutpoints)) {
		// when no pending transactions have been initiated, we cannot validate UTXO's and therefore, validation must fail
		throw new BtcValidationError(BtcSendValidationError.PendingTransactionsNotAvailable);
	}

	if (pendingUtxoOutpoints.length > 0) {
		const reserved = new Set(pendingUtxoOutpoints);
		const providedOutpoints = extractUtxoOutpoints(utxos);

		for (const outpointKey of providedOutpoints) {
			if (reserved.has(outpointKey)) {
				throw new BtcValidationError(BtcSendValidationError.UtxoLocked);
			}
		}
	}

	// 3. Verify UTXO values and calculate totals
	const totalUtxoValue = utxos.reduce((sum, utxo) => sum + BigInt(utxo.value), ZERO);
	if (totalUtxoValue <= ZERO) {
		throw new BtcValidationError(BtcSendValidationError.InvalidUtxoData);
	}

	// 4. Validate the fee prices the transaction structure this selection will broadcast
	// (the recipient's output, sized from its script, + change), at the rate it was quoted with.
	//
	// The rate comes from the fee itself, never from a fresh sample of the percentiles. The
	// two are not interchangeable: the median percentile shifts by more than this tolerance
	// within a minute of ordinary mempool movement, and near the 1 sat/vByte floor a single
	// slot of drift already exceeds 10%. Checking the quoted fee against a later sample
	// therefore rejected sends whose fee was correct when it was quoted and still is. A
	// stale preview is a reason to refresh the preview, not to block a broadcast the user
	// has approved.
	const expectedFee = calculateFeeSatoshis({
		numInputs: utxos.length,
		recipientOutputVSize: btcOutputVSize({ address: destination }),
		feeRateMiliSatoshisPerVByte
	});

	// Allow some tolerance for fee calculation differences (±10%)
	const feeToleranceRange = expectedFee / BTC_SEND_FEE_TOLERANCE_PERCENTAGE;
	const minAcceptableFee = expectedFee - feeToleranceRange;
	const maxAcceptableFee = expectedFee + feeToleranceRange;

	if (feeSatoshis < minAcceptableFee || feeSatoshis > maxAcceptableFee) {
		throw new BtcValidationError(BtcSendValidationError.InvalidFeeCalculation);
	}

	// 5. Verify sufficient funds for amount + fee
	const totalRequired = amountSatoshis + feeSatoshis;
	if (totalUtxoValue < totalRequired) {
		throw new BtcValidationError(BtcSendValidationError.InsufficientBalanceForFee);
	}

	// TODO we must solve the dust issue first in prepareBtcSend before implementing this validation:
	// 6. Check for dust amounts in change output
	// const changeAmount = totalUtxoValue - totalRequired;
	// const DUST_THRESHOLD = 546n; // Standard Bitcoin dust threshold
	// if (changeAmount > ZERO && changeAmount < DUST_THRESHOLD) {
	//	throw new Error(
	//		`Transaction would create dust: change amount ${changeAmount} satoshis ` +
	//			`is below dust threshold ${DUST_THRESHOLD} satoshis`
	//	);
	// }
};

export const signBtc = async ({
	utxosFee,
	network,
	identity,
	satoshisAmount,
	destination
}: SignBtcParams): Promise<SignBtcResponse> => {
	const signerBitcoinNetwork = mapToSignerBitcoinNetwork({ network });

	return await signBtcApi({
		identity,
		network: signerBitcoinNetwork,
		feeSatoshis: toNullable(utxosFee.feeSatoshis),
		utxosToSpend: utxosFee.utxos,
		outputs: [{ destination_address: destination, sent_satoshis: satoshisAmount }]
	});
};

export const sendBtc = async (params: SendBtcParams): Promise<string> =>
	BTC_SEND_VIA_BACKEND_ENABLED && params.viaBackend === true
		? await sendBtcViaBackend(params)
		: await sendBtcViaSigner(params);

/**
 * Builds and signs the transaction in the frontend, then has the backend broadcast it.
 *
 * The backend reserves the inputs in the same call, so nothing is recorded afterwards. A failure
 * before the broadcast call sent nothing. The broadcast's own failure is its typed answer
 * (`BtcBroadcastTransactionCanisterError`), or, with none, `BtcBroadcastUnconfirmedError`: the
 * transaction may have gone out.
 */
const sendBtcViaBackend = async ({
	utxosFee,
	network,
	source,
	destination,
	amount,
	identity,
	onProgress,
	beforeBroadcast,
	onBroadcast
}: SendBtcParams): Promise<string> => {
	const psbt = buildBtcSendPsbt({
		utxos: utxosFee.utxos,
		outputs: [{ destination, amount: convertNumberToSatoshis({ amount }) }],
		changeAddress: source,
		feeSatoshis: utxosFee.feeSatoshis,
		network
	});

	onProgress?.();

	const { txid, bytes } = await signAndFinalizeBtcPsbt({ psbt, identity });

	await beforeBroadcast?.({ txid });

	try {
		await broadcastBtcTransaction({
			identity,
			network: mapToSignerBitcoinNetwork({ network }),
			transaction: bytes,
			iiDelegationChain: extractIIDelegationChain(identity)
		});
	} catch (err: unknown) {
		throw err instanceof BtcBroadcastTransactionCanisterError
			? err
			: new BtcBroadcastUnconfirmedError({ cause: err });
	}

	// The transaction is out, so nothing from here may fail the send: a caller would read that as
	// not sent, and could send it again. Each step runs whatever the one before did.
	await runAfterBroadcast(() => onBroadcast?.({ txid }));
	await runAfterBroadcast(() => onProgress?.());
	await runAfterBroadcast(waitAndTriggerWallet);

	return txid;
};

const runAfterBroadcast = async (step: () => unknown): Promise<void> => {
	try {
		await step();
	} catch (err: unknown) {
		consoleError(err);
	}
};

const sendBtcViaSigner = async ({
	utxosFee,
	network,
	source: _source,
	identity,
	onProgress,
	onBroadcast,
	beforeBroadcast: _beforeBroadcast,
	viaBackend: _viaBackend,
	...rest
}: SendBtcParams): Promise<string> => {
	const { txid } = await send({ onProgress, utxosFee, network, identity, ...rest });

	// Best-effort by contract: the bookkeeping below protects this flow's own
	// invariants (the spent UTXOs are recorded as pending), so a failing callback
	// must not derail it.
	try {
		await onBroadcast?.({ txid });
	} catch (err: unknown) {
		consoleError(err);
	}

	await addPendingBtcTransaction({
		identity,
		network: mapToSignerBitcoinNetwork({ network }),
		txId: txidStringToUint8Array(txid),
		utxos: utxosFee.utxos,
		iiDelegationChain: extractIIDelegationChain(identity)
	});

	onProgress?.();

	await waitAndTriggerWallet();

	return txid;
};

const send = async ({
	identity,
	destination,
	network,
	amount,
	utxosFee,
	onProgress
}: Omit<SendBtcParams, 'source' | 'beforeBroadcast' | 'viaBackend'>): Promise<SendBtcResponse> => {
	const satoshisAmount = convertNumberToSatoshis({ amount });
	const signerBitcoinNetwork = mapToSignerBitcoinNetwork({ network });

	onProgress?.();

	return await sendBtcApi({
		identity,
		network: signerBitcoinNetwork,
		feeSatoshis: toNullable(utxosFee.feeSatoshis),
		utxosToSpend: utxosFee.utxos,
		outputs: [{ destination_address: destination, sent_satoshis: satoshisAmount }]
	});
};
