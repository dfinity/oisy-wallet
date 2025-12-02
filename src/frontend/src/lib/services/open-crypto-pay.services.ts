import { calculateEthFee } from '$eth/services/pay.services';
import type { EthFeeResult } from '$eth/types/pay';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import type {
	OpenCryptoPayResponse,
	PayableToken,
	PayableTokenWithFees
} from '$lib/types/open-crypto-pay';
import { decodeLNURL } from '$lib/utils/open-crypto-pay.utils';
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
