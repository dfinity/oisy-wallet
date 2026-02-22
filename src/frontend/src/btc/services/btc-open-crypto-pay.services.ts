import { signBtc } from '$btc/services/btc-send.services';
import { prepareBtcSend } from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import type { UtxosFee } from '$btc/types/btc-send';
import { txidStringToUint8Array } from '$icp/utils/btc.utils';
import { addPendingBtcTransaction } from '$lib/api/backend.api';
import { btcAddressMainnet } from '$lib/derived/address.derived';
import { ProgressStepsPayment } from '$lib/enums/progress-steps';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import type { PayableToken, PayParams, ValidatedBtcPaymentData } from '$lib/types/open-crypto-pay';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { getPaymentUri } from '$lib/utils/open-crypto-pay.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const calculateBtcFee = (token: PayableToken): UtxosFee | undefined => {
	const feeRateMiliSatoshisPerVByteStore = get(feeRatePercentilesStore)?.feeRateFromPercentiles;
	const allUtxos = get(allUtxosStore)?.allUtxos;
	const address = get(btcAddressMainnet);

	if (isNullish(address) || isNullish(feeRateMiliSatoshisPerVByteStore) || isNullish(allUtxos)) {
		return;
	}

	const feeRateMiliSatoshisPerVByteProvider = nonNullish(token.minFee)
		? Math.round(token.minFee * 1000)
		: 0;
	const feeRateMiliSatoshisPerVByte = BigInt(
		Math.max(Number(feeRateMiliSatoshisPerVByteStore), feeRateMiliSatoshisPerVByteProvider)
	);

	return prepareBtcSend({
		amount: token.amount,
		source: address,
		allUtxos,
		feeRateMiliSatoshisPerVByte
	});
};

export const payBtc = async ({
	token,
	identity,
	validatedData,
	progress,
	quoteId,
	callback
}: Omit<PayParams, 'data' | 'amount'> & {
	validatedData: ValidatedBtcPaymentData;
}) => {
	const { txid, signed_transaction_hex } = await signBtc({
		identity,
		network: token.network.env,
		utxosFee: validatedData.utxosFee,
		satoshisAmount: validatedData.satoshisAmount,
		destination: validatedData.destination
	});

	progress(ProgressStepsPayment.PAY);

	const apiUrl = getPaymentUri({
		callback,
		quoteId,
		network: token.network.pay?.openCryptoPay ?? token.network.name,
		rawTransaction: signed_transaction_hex
	});

	await fetchOpenCryptoPay(apiUrl);

	const address = get(btcAddressMainnet);

	nonNullish(address) &&
		(await addPendingBtcTransaction({
			identity,
			network: mapToSignerBitcoinNetwork({ network: token.network.env }),
			address,
			txId: txidStringToUint8Array(txid),
			utxos: validatedData.utxosFee.utxos
		}));
};
