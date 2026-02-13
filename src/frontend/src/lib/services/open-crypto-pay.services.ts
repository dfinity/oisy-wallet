import { calculateBtcFee, payBtc } from '$btc/services/btc-open-crypto-pay.services';
import type { UtxosFee } from '$btc/types/btc-send';
import { isBitcoinToken } from '$btc/utils/token.utils';
import { calculateEthFee, payEth } from '$eth/services/eth-open-crypto-pay.services';
import type { EthFeeResult } from '$eth/types/pay';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { ProgressStepsPayment } from '$lib/enums/progress-steps';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import type {
	OpenCryptoPayResponse,
	PayParams,
	PayableToken,
	PayableTokenWithFees,
	ValidatedBtcPaymentData,
	ValidatedEthPaymentData
} from '$lib/types/open-crypto-pay';
import {
	decodeLNURL,
	extractQuoteData,
	validateDecodedData
} from '$lib/utils/open-crypto-pay.utils';
import { decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { isEmptyString, isNullish } from '@dfinity/utils';

const decodeLightningParam = (params: string): string => {
	const decoded = decodeLNURL(params);

	if (isNullish(decoded)) {
		throw new Error('Failed to decode lightning parameter');
	}

	return decoded;
};

const parseOpenCryptoPayCode = (qrText: string): string => {
	if (isEmptyString(qrText.trim())) {
		throw new Error('QR Code cannot be empty');
	}

	const url = new URL(qrText.trim());

	const lightningParam = url.searchParams.get('lightning');

	if (isNullish(lightningParam)) {
		throw new Error('Missing lightning parameter');
	}

	return decodeLightningParam(lightningParam);
};

export const processOpenCryptoPayCode = async (code: string): Promise<OpenCryptoPayResponse> => {
	const decodedApiUrl = parseOpenCryptoPayCode(code);
	return await fetchOpenCryptoPay<OpenCryptoPayResponse>(decodedApiUrl);
};

const calculateTokenFee = async (
	token: PayableToken
): Promise<EthFeeResult | UtxosFee | undefined> => {
	if (isBitcoinToken(token)) {
		return calculateBtcFee(token);
	}

	if (isDefaultEthereumToken(token) || isTokenErc20(token)) {
		return await calculateEthFee(token);
	}
};

export const calculateTokensWithFees = async (
	tokens: PayableToken[]
): Promise<PayableTokenWithFees[]> => {
	const feeResults = await Promise.allSettled(
		tokens.map(async (token) => ({
			...token,
			fee: await calculateTokenFee(token)
		}))
	);

	return feeResults.reduce<PayableTokenWithFees[]>((acc, result) => {
		if (result.status === 'fulfilled') {
			acc.push(result.value);
		}
		return acc;
	}, []);
};

const getValidatedTransactionData = async ({
	token,
	quoteId,
	callback,
	amount
}: Omit<PayParams, 'identity' | 'data' | 'progress'>): Promise<
	ValidatedEthPaymentData | ValidatedBtcPaymentData | undefined
> => {
	const url = `${callback}?quote=${quoteId}&method=${token.network.pay?.openCryptoPay ?? token.network.name}&asset=${token.symbol}`;
	const { uri } = await fetchOpenCryptoPay<{ uri: string }>(url);

	const decodedData = decodeQrCodeUrn({ urn: uri });

	return validateDecodedData({
		decodedData,
		token,
		amount,
		uri
	});
};

export const pay = async ({
	token,
	data,
	identity,
	amount,
	progress
}: Omit<PayParams, 'quoteId' | 'callback'>): Promise<void> => {
	progress(ProgressStepsPayment.CREATE_TRANSACTION);

	const { quoteId, callback } = extractQuoteData(data);

	const validatedData = await getValidatedTransactionData({
		token,
		quoteId,
		callback,
		amount
	});

	if (isNullish(validatedData)) {
		throw new Error('Payment data was not validated');
	}

	progress(ProgressStepsPayment.SIGN_TRANSACTION);

	if (isBitcoinToken(token)) {
		await payBtc({
			validatedData: validatedData as ValidatedBtcPaymentData,
			token,
			quoteId,
			callback,
			progress,
			identity
		});
		return;
	}

	if (isDefaultEthereumToken(token) || isTokenErc20(token)) {
		await payEth({
			validatedData: validatedData as ValidatedEthPaymentData,
			token,
			quoteId,
			callback,
			progress,
			identity
		});
	}
};
