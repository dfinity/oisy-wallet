import type { UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import type { SendBtcResponse } from '$declarations/signer/signer.did';
import { selectUserUtxosFee } from '$lib/api/backend.api';
import { sendBtc as sendBtcApi } from '$lib/api/signer.api';
import type { BtcAddress } from '$lib/types/address';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork } from '@dfinity/ckbtc';

const DEFAULT_MIN_CONFIRMATIONS = 6;

type BtcSendServiceParams<T = unknown> = {
	identity: Identity;
	network: BitcoinNetwork;
	amount: number;
} & T;

export const selectUtxosFee = async ({
	identity,
	network,
	amount
}: BtcSendServiceParams<{
	sourceAddress: BtcAddress;
}>): Promise<UtxosFee> => {
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
	identity,
	destination,
	network,
	amount,
	utxosFee
}: BtcSendServiceParams<{
	destination: BtcAddress;
	utxosFee: UtxosFee;
}>): Promise<SendBtcResponse> => {
	const satoshisAmount = convertNumberToSatoshis({ amount });
	const signerBitcoinNetwork = mapToSignerBitcoinNetwork({ network });

	return sendBtcApi({
		identity,
		network: signerBitcoinNetwork,
		feeSatoshis: [utxosFee.feeSatoshis],
		utxosToSpend: utxosFee.utxos,
		outputs: [{ destination_address: destination, sent_satoshis: satoshisAmount }]
	});
};
