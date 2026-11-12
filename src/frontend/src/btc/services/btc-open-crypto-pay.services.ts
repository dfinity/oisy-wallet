import { signBtc } from '$btc/services/btc-send.services';
import { signAndFinalizeBtcPsbt } from '$btc/services/btc-sign.services';
import { prepareBtcSend } from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import type { UtxosFee } from '$btc/types/btc-send';
import { buildBtcSendPsbt } from '$btc/utils/btc-psbt.utils';
import { BTC_SEND_VIA_BACKEND_ENABLED } from '$env/btc.env';
import { txidStringToUint8Array } from '$icp/utils/btc.utils';
import { addPendingBtcTransaction } from '$lib/api/backend.api';
import { btcAddressMainnet } from '$lib/derived/address.derived';
import { ProgressStepsPayment } from '$lib/enums/progress-steps';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import { i18n } from '$lib/stores/i18n.store';
import type { PayableToken, PayParams, ValidatedBtcPaymentData } from '$lib/types/open-crypto-pay';
import { consoleError } from '$lib/utils/console.utils';
import { freshIIDelegationChain } from '$lib/utils/delegation.utils';
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

type PayBtcParams = Omit<PayParams, 'data' | 'amount'> & {
	validatedData: ValidatedBtcPaymentData;
};

export const payBtc = async (params: PayBtcParams): Promise<void> =>
	BTC_SEND_VIA_BACKEND_ENABLED ? await payBtcWithPrehash(params) : await payBtcWithSigner(params);

/**
 * Builds and signs the payment in OISY, one `btc_sign_prehash` per input, and hands it to
 * OpenCryptoPay, which broadcasts it.
 *
 * Its inputs are reserved before the hand-off, so a payment that went out is never left
 * unreserved, and every step that can fail without contacting OpenCryptoPay runs before the
 * reservation. A failed hand-off keeps the reservation until the backend prunes it: from the
 * browser, a failed request does not prove that OpenCryptoPay never received the transaction.
 */
const payBtcWithPrehash = async ({
	token,
	identity,
	validatedData: { destination, satoshisAmount, utxosFee },
	progress,
	quoteId,
	callback
}: PayBtcParams): Promise<void> => {
	const address = get(btcAddressMainnet);

	if (isNullish(address)) {
		throw new Error(get(i18n).send.assertion.address_unknown);
	}

	const network = token.network.env;

	const psbt = buildBtcSendPsbt({
		utxos: utxosFee.utxos,
		outputs: [{ destination, amount: satoshisAmount }],
		changeAddress: address,
		feeSatoshis: utxosFee.feeSatoshis,
		network
	});

	const { txid, hex } = await signAndFinalizeBtcPsbt({ psbt, identity });

	const apiUrl = getPaymentUri({
		callback,
		quoteId,
		network: token.network.pay.openCryptoPay,
		rawTransaction: hex
	});

	// A retry over the same inputs signs the same txid, which the backend accepts again.
	const { rateLimitInfo } = await addPendingBtcTransaction({
		identity,
		network: mapToSignerBitcoinNetwork({ network }),
		txId: txidStringToUint8Array(txid),
		utxos: utxosFee.utxos,
		iiDelegationChain: extractIIDelegationChain(identity)
	});

	// The canister wrapper reports a rate limit as a success, but nothing was reserved.
	if (nonNullish(rateLimitInfo)) {
		throw new Error(get(i18n).pay.error.btc_reservation_rate_limited);
	}

	// From here an error no longer tells whether OpenCryptoPay received the payment.
	progress(ProgressStepsPayment.PAY);

	await fetchOpenCryptoPay(apiUrl);
};

const payBtcWithSigner = async ({
	token,
	identity,
	validatedData,
	progress,
	quoteId,
	callback
}: PayBtcParams): Promise<void> => {
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
		network: token.network.pay.openCryptoPay,
		rawTransaction: signed_transaction_hex
	});

	await fetchOpenCryptoPay(apiUrl);

	const address = get(btcAddressMainnet);

	// The provider has accepted the payment at this point, so recording the spent UTXOs as pending
	// is best-effort: its failure must not turn a completed payment into an error.
	try {
		nonNullish(address) &&
			(await addPendingBtcTransaction({
				identity,
				network: mapToSignerBitcoinNetwork({ network: token.network.env }),
				txId: txidStringToUint8Array(txid),
				utxos: validatedData.utxosFee.utxos,
				iiDelegationChain: await freshIIDelegationChain({ identity })
			}));
	} catch (err: unknown) {
		consoleError(err);
	}
};
