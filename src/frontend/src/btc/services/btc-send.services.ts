import type { UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { selectUserUtxosFee } from '$lib/api/backend.api';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork } from '@dfinity/ckbtc';

const DEFAULT_MIN_CONFIRMATIONS = 6;

export const selectUtxosFee = async ({
	identity,
	network,
	amount
}: {
	identity: Identity;
	network: BitcoinNetwork;
	amount: number;
}): Promise<UtxosFee> => {
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
