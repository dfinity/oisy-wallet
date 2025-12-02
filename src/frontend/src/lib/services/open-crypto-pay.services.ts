import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { getErc20FeeData, getEthFeeDataWithProvider } from '$eth/services/fee.services';
import type { OptionEthAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isDefaultEthereumToken, isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import { ZERO } from '$lib/constants/app.constants';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import type {
	EthFeeResult,
	OpenCryptoPayResponse,
	PayableToken,
	PayableTokenWithFees
} from '$lib/types/open-crypto-pay';
import { maxBigInt } from '$lib/utils/bigint.utils';
import { decodeLNURL } from '$lib/utils/open-crypto-pay.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { isEmptyString, isNullish, nonNullish } from '@dfinity/utils';

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

const calculateEthFee = async ({
	userAddress,
	token
}: {
	userAddress: OptionEthAddress;
	token: PayableToken;
}): Promise<EthFeeResult | undefined> => {
	try {
		if (isNullish(userAddress)) {
			return;
		}

		const { feeData, provider, params } = await getEthFeeDataWithProvider({
			networkId: token.network.id,
			chainId: (token.network as EthereumNetwork).chainId,
			from: userAddress,
			to: userAddress
		});

		const { safeEstimateGas } = provider;

		const actualGasPrice = feeData.maxFeePerGas;

		if (isNullish(actualGasPrice)) {
			return;
		}

		let estimatedGasLimit: bigint | undefined;

		if (isSupportedEthTokenId(token.id) || isSupportedEvmNativeTokenId(token.id)) {
			const estimatedGas = await safeEstimateGas({
				...params,
				...(nonNullish(token.amount)
					? { value: parseToken({ value: token.amount.toString(), unitName: token.decimals }) }
					: {})
			});

			estimatedGasLimit = maxBigInt(ETH_BASE_FEE, estimatedGas);
		} else {
			if (!isTokenErc20(token)) {
				return;
			}

			const erc20GasFeeParams = {
				...params,
				contract: token,
				amount: parseToken({ value: `${token.amount ?? '1'}`, unitName: token.decimals }),
				sourceNetwork: token.network
			};

			estimatedGasLimit = await getErc20FeeData({
				...erc20GasFeeParams,
				to: erc20GasFeeParams.to,
				targetNetwork: token.network
			});
		}

		if (isNullish(estimatedGasLimit)) {
			return;
		}

		const gasPrice = maxBigInt(actualGasPrice, BigInt(token.minFee ?? 0));

		if (gasPrice === ZERO) {
			return;
		}

		const feeInWei = gasPrice * estimatedGasLimit;

		return { feeInWei, feeData, estimatedGasLimit };
	} catch (error) {
		console.warn(`Failed to calculate fee for ${token.symbol}:`, error);
	}
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
		const fee = await calculateEthFee({
			userAddress,
			token
		});

		if (nonNullish(fee)) {
			return fee;
		}
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
