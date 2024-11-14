import type { UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import type { SendBtcResponse } from '$declarations/signer/signer.did';
import { addPendingBtcTransaction, selectUserUtxosFee } from '$lib/api/backend.api';
import { sendBtc as sendBtcApi } from '$lib/api/signer.api';
import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
import type { BtcAddress } from '$lib/types/address';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { hexStringToUint8Array, toNullable } from '@dfinity/utils';

const DEFAULT_MIN_CONFIRMATIONS = 6;

interface BtcSendServiceParams {
	identity: Identity;
	network: BitcoinNetwork;
	amount: number;
	progress: (step: ProgressStepsSendBtc) => void;
}

export type SendBtcParams = BtcSendServiceParams & {
	destination: BtcAddress;
	source: BtcAddress;
	utxosFee: UtxosFee;
};

export const selectUtxosFee = async ({
	identity,
	network,
	amount
}: Omit<BtcSendServiceParams, 'progress'>): Promise<UtxosFee> => {
	const satoshisAmount = convertNumberToSatoshis({ amount });
	const signerBitcoinNetwork = mapToSignerBitcoinNetwork({ network });

	const { fee_satoshis, utxos } = await selectUserUtxosFee({
		identity,
		network: signerBitcoinNetwork,
		amountSatoshis: satoshisAmount,
		minConfirmations: [DEFAULT_MIN_CONFIRMATIONS]
	});

	return {
		feeSatoshis: fee_satoshis,
		utxos
	};
};

export const sendBtc = async ({
	progress,
	utxosFee,
	network,
	source,
	identity,
	...rest
}: SendBtcParams): Promise<void> => {
	const { txid } = await send({ progress, utxosFee, network, identity, ...rest });

	progress(ProgressStepsSendBtc.RELOAD);

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
	progress
}: Omit<SendBtcParams, 'source'>): Promise<SendBtcResponse> => {
	const satoshisAmount = convertNumberToSatoshis({ amount });
	const signerBitcoinNetwork = mapToSignerBitcoinNetwork({ network });

	progress(ProgressStepsSendBtc.SEND);

	return await sendBtcApi({
		identity,
		network: signerBitcoinNetwork,
		feeSatoshis: toNullable(utxosFee.feeSatoshis),
		utxosToSpend: utxosFee.utxos,
		outputs: [{ destination_address: destination, sent_satoshis: satoshisAmount }]
	});
};
