import { selectUtxos } from '$lib/api/backend.api';
import { sendBtcTokens as sendBtcTokensApi } from '$lib/api/signer.api';
import type { Identity } from '@dfinity/agent';

export const sendBtcTokens = async ({
	identity,
	destination,
	sourceAddress,
	amount
}: {
	identity: Identity;
	destination: string;
	sourceAddress: string;
	amount: number;
}) => {
	try {
		const satoshisAmount = amount * 100_000_000;
		const utxosResponse = await selectUtxos({
			identity,
			transactionParams: {
				network: { regtest: null },
				amount_satoshis: BigInt(satoshisAmount),
				source_address: sourceAddress
			}
		});

		console.log('after da utxosResponse', utxosResponse);

		const txid = await sendBtcTokensApi({
			identity,
			transactionParams: {
				fee_satoshis: [1_000_000n],
				network: { regtest: null },
				utxos_to_spend: [utxosResponse.utxos[0]],
				address_type: { P2WPKH: null },
				outputs: [{ destination_address: destination, sent_satoshis: BigInt(satoshisAmount) }]
			}
		});

		console.log('after da sendBtcTokensApi', txid);
	} catch (error) {
		console.error(error);
	}
};
