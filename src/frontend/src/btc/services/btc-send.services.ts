import { BtcSendValidationError, BtcValidationError, type UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { estimateTransactionSize, extractUtxoTxIds } from '$btc/utils/btc-utxos.utils';
import type { SendBtcResponse } from '$declarations/signer/signer.did';
import { getPendingTransactionIds } from '$icp/utils/btc.utils';
import { addPendingBtcTransaction } from '$lib/api/backend.api';
import { sendBtc as sendBtcApi } from '$lib/api/signer.api';
import type { BtcAddress } from '$lib/types/address';
import type { Amount } from '$lib/types/send';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { hexStringToUint8Array, toNullable } from '@dfinity/utils';

interface BtcSendServiceParams {
	identity: Identity;
	network: BitcoinNetwork;
	amount: Amount;
}

export type SendBtcParams = BtcSendServiceParams & {
	destination: BtcAddress;
	source: BtcAddress;
	utxosFee: UtxosFee;
	onProgress?: () => void;
};

/**
 * Validates all aspects of the provided UTXOs before sending Bitcoin transaction
 * @param params - Object containing all validation parameters
 * @throws BtcValidationError with specific error type if any validation fails
 */
export const validateUtxosForSend = ({
	utxosFee,
	source,
	amount,
	feeRateSatoshisPerVByte = 1n
}: {
	utxosFee: UtxosFee;
	source: BtcAddress;
	amount: Amount;
	feeRateSatoshisPerVByte?: bigint;
}): void => {
	const { utxos, feeSatoshis } = utxosFee;
	const amountSatoshis = convertNumberToSatoshis({ amount });

	// 1. Check if UTXOs array is not empty
	if (utxos.length === 0) {
		throw new BtcValidationError(BtcSendValidationError.InsufficientBalance);
	}

	// 2. Validate UTXO ownership (basic structure validation)
	for (const utxo of utxos) {
		if (
			!utxo.outpoint?.txid ||
			utxo.outpoint.vout === undefined ||
			!utxo.value ||
			BigInt(utxo.value) <= 0n ||
			!utxo.height ||
			utxo.height < 0
		) {
			throw new BtcValidationError(BtcSendValidationError.InvalidUtxoData);
		}
	}

	// 3. Check if UTXOs are still unspent (not locked by pending transactions)
	const pendingTxIds = getPendingTransactionIds(source);
	if (pendingTxIds.length > 0) {
		const providedUtxoTxIds = extractUtxoTxIds(utxos);
		for (const utxoTxId of providedUtxoTxIds) {
			if (pendingTxIds.includes(utxoTxId)) {
				throw new BtcValidationError(BtcSendValidationError.UtxoLocked);
			}
		}
	}

	// 4. Verify UTXO values and calculate totals
	const totalUtxoValue = utxos.reduce((sum, utxo) => sum + BigInt(utxo.value), 0n);
	if (totalUtxoValue <= 0n) {
		throw new BtcValidationError(BtcSendValidationError.InvalidUtxoData);
	}

	// 5. Validate fee calculation matches expected transaction structure ( recipient + change)
	const estimatedTxSize = estimateTransactionSize({
		numInputs: utxos.length,
		numOutputs: 2
	});
	const expectedMinFee = BigInt(estimatedTxSize) * feeRateSatoshisPerVByte;

	// Allow some tolerance for fee calculation differences (±10%)
	const feeToleranceRange = expectedMinFee / 10n;
	const minAcceptableFee = expectedMinFee - feeToleranceRange;
	const maxAcceptableFee = expectedMinFee + feeToleranceRange;

	if (feeSatoshis < minAcceptableFee || feeSatoshis > maxAcceptableFee) {
		throw new BtcValidationError(BtcSendValidationError.InvalidFeeCalculation);
	}

	// 6. Verify sufficient funds for amount + fee
	const totalRequired = amountSatoshis + feeSatoshis;
	if (totalUtxoValue < totalRequired) {
		throw new BtcValidationError(BtcSendValidationError.InsufficientBalanceForFee);
	}

	// TODO we must solve the dust issue first in prepareBtcSend before implementing this validation:
	// 7. Check for dust amounts in change output
	// const changeAmount = totalUtxoValue - totalRequired;
	// const DUST_THRESHOLD = 546n; // Standard Bitcoin dust threshold
	// if (changeAmount > 0n && changeAmount < DUST_THRESHOLD) {
	//	throw new Error(
	//		`Transaction would create dust: change amount ${changeAmount} satoshis ` +
	//			`is below dust threshold ${DUST_THRESHOLD} satoshis`
	//	);
	// }
};

export const sendBtc = async ({
	utxosFee,
	network,
	source,
	identity,
	amount,
	onProgress,
	...rest
}: SendBtcParams): Promise<void> => {
	const { txid } = await send({ onProgress, utxosFee, network, identity, amount, ...rest });

	onProgress?.();

	await addPendingBtcTransaction({
		identity,
		network: mapToSignerBitcoinNetwork({ network }),
		address: source,
		txId: hexStringToUint8Array(txid),
		utxos: utxosFee.utxos
	});

	await waitAndTriggerWallet();
};

const send = async ({
	identity,
	destination,
	network,
	amount,
	utxosFee,
	onProgress
}: Omit<SendBtcParams, 'source'>): Promise<SendBtcResponse> => {
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
