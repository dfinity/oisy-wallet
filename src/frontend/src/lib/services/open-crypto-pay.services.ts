import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { getNonce } from '$eth/services/nonce.services';
import { calculateEthFee } from '$eth/services/pay.services';
import { erc20PrepareTransaction, ethPrepareTransaction } from '$eth/services/send.services';
import type { EthAddress } from '$eth/types/address';
import type { EthFeeResult } from '$eth/types/pay';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { signTransaction } from '$lib/api/signer.api';
import { ProgressStepsPayment } from '$lib/enums/progress-steps';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import { i18n } from '$lib/stores/i18n.store';
import type {
	OpenCryptoPayResponse,
	PayParams,
	PayableToken,
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees,
	TransactionBaseParams,
	ValidatedDFXPaymentData
} from '$lib/types/open-crypto-pay';
import {
	decodeLNURL,
	extractQuoteData,
	validateDecodedData
} from '$lib/utils/open-crypto-pay.utils';
import { decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { isEmptyString, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

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

const calculateTokenFee = async ({
	token,
	userAddress
}: {
	token: PayableToken;
	userAddress: string;
}): Promise<EthFeeResult | undefined> => {
	// Add other network fee calculations here as needed (e.g., Bitcoin, ICP, etc.)
	if (isDefaultEthereumToken(token) || isTokenErc20(token)) {
		return await calculateEthFee({
			userAddress,
			token
		});
	}
};

export const calculateTokensWithFees = async ({
	tokens,
	userAddress
}: {
	tokens: PayableToken[];
	userAddress: string;
}): Promise<PayableTokenWithFees[]> => {
	const feeResults = await Promise.allSettled(
		tokens.map(async (token) => ({
			...token,
			fee: await calculateTokenFee({ token, userAddress })
		}))
	);

	return feeResults.reduce<PayableTokenWithFees[]>((acc, result) => {
		if (result.status === 'fulfilled') {
			acc.push(result.value);
		}
		return acc;
	}, []);
};

export const buildTransactionBaseParams = ({
	from,
	nonce,
	validatedData
}: {
	from: EthAddress;
	nonce: number;
	validatedData: ValidatedDFXPaymentData;
}): TransactionBaseParams => ({
	from,
	to: validatedData.destination,
	amount: validatedData.value,
	maxPriorityFeePerGas: validatedData.feeData.maxPriorityFeePerGas,
	maxFeePerGas: validatedData.feeData.maxFeePerGas,
	nonce,
	gas: validatedData.estimatedGasLimit,
	chainId: validatedData.ethereumChainId
});

export const prepareEthTransaction = ({
	baseParams
}: {
	baseParams: TransactionBaseParams;
}): EthSignTransactionRequest => ethPrepareTransaction(baseParams);

export const prepareErc20Transaction = ({
	baseParams,
	token
}: {
	baseParams: TransactionBaseParams;
	token: PayableTokenWithConvertedAmount;
}): Promise<EthSignTransactionRequest> =>
	erc20PrepareTransaction({
		...baseParams,
		token,
		populate: infuraErc20Providers(token.network.id).populateTransaction
	});

const fetchPaymentUri = async ({
	callback,
	quoteId,
	network,
	tokenSymbol
}: {
	callback: string;
	quoteId: string;
	network: string;
	tokenSymbol: string;
}): Promise<string> => {
	const url = `${callback}?quote=${quoteId}&method=${network}&asset=${tokenSymbol}`;

	const { uri } = await fetchOpenCryptoPay<{ uri: string }>(url);

	return uri;
};

const getPaymentUri = ({
	callback,
	quoteId,
	network,
	rawTransaction
}: {
	callback: string;
	quoteId: string;
	network: string;
	rawTransaction: string;
}): string => {
	// By dfx documentation we need to replace 'cb' with 'tx' to get the transaction submission endpoint
	const apiUrl = callback.replace('cb', 'tx');

	return `${apiUrl}?quote=${quoteId}&method=${network}&hex=${rawTransaction}`;
};

const preparePaymentTransaction = async ({
	token,
	from,
	quoteId,
	callback,
	amount,
	progress
}: Omit<PayParams, 'identity' | 'data'>): Promise<EthSignTransactionRequest> => {
	const uri = await fetchPaymentUri({
		callback,
		quoteId,
		network: token.network.pay?.openCryptoPay ?? token.network.name,
		tokenSymbol: token.symbol
	});

	progress(ProgressStepsPayment.CREATE_TRANSACTION);

	const decodedData = decodeQrCodeUrn({ urn: uri });
	const validatedData = validateDecodedData({ decodedData, token, amount, uri });
	const nonce = await getNonce({ from, networkId: token.network.id });
	const baseParams = buildTransactionBaseParams({ from, nonce, validatedData });

	return isDefaultEthereumToken(token)
		? prepareEthTransaction({ baseParams })
		: prepareErc20Transaction({ baseParams, token });
};

export const pay = async ({
	token,
	data,
	from,
	identity,
	amount,
	progress
}: Omit<PayParams, 'quoteId' | 'callback'>): Promise<void> => {
	const { quoteId, callback } = extractQuoteData(data);

	const transaction = await preparePaymentTransaction({
		token,
		from,
		quoteId,
		callback,
		progress,
		amount
	});

	progress(ProgressStepsPayment.SIGN_TRANSACTION);

	const rawTransaction = await signTransaction({
		identity,
		transaction,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	progress(ProgressStepsPayment.PAY);

	const apiUrl = getPaymentUri({
		callback,
		quoteId,
		network: token.network.pay?.openCryptoPay ?? token.network.name,
		rawTransaction
	});

	await fetchOpenCryptoPay(apiUrl);
};
