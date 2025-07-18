import type { UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import type { SendBtcResponse } from '$declarations/signer/signer.did';
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

export const sendBtc = async ({
	utxosFee,
	network,
	source,
	identity,
	onProgress,
	...rest
}: SendBtcParams): Promise<void> => {
	// TODO: use txid returned by this method to register it as a pending transaction in BE
	const { txid } = await send({ onProgress, utxosFee, network, identity, ...rest });

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
