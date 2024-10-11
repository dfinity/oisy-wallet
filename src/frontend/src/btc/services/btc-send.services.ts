import type { UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import type { SendBtcResponse } from '$declarations/signer/signer.did';
import { selectUserUtxosFee } from '$lib/api/backend.api';
import { sendBtc as sendBtcApi } from '$lib/api/signer.api';
import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
import type { BtcAddress } from '$lib/types/address';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { toNullable } from '@dfinity/utils';

const DEFAULT_MIN_CONFIRMATIONS = 6;

interface BtcSendServiceParams {
	identity: Identity;
	network: BitcoinNetwork;
	amount: number;
	progress: (step: ProgressStepsSendBtc) => void;
}

type SendBtcParams = BtcSendServiceParams & {
	destination: BtcAddress;
	utxosFee: UtxosFee;
};

export const selectUtxosFee = async ({
	identity,
	network,
	amount
}: BtcSendServiceParams): Promise<UtxosFee> => {
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

export const sendBtc = async ({ progress, ...rest }: SendBtcParams): Promise<void> => {
	// TODO: use txid returned by this method to register it as a pending transaction in BE
	await send({ progress, ...rest });

	progress(ProgressStepsSendBtc.RELOAD);

	await waitAndTriggerWallet();
};

const send = async ({
	identity,
	destination,
	network,
	amount,
	utxosFee,
	progress
}: SendBtcParams): Promise<SendBtcResponse> => {
	const satoshisAmount = convertNumberToSatoshis({ amount });
	const signerBitcoinNetwork = mapToSignerBitcoinNetwork({ network });

	progress(ProgressStepsSendBtc.SEND);

	return sendBtcApi({
		identity,
		network: signerBitcoinNetwork,
		feeSatoshis: toNullable(utxosFee.feeSatoshis),
		utxosToSpend: utxosFee.utxos,
		outputs: [{ destination_address: destination, sent_satoshis: satoshisAmount }]
	});
};
