import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { enrichEthEvmToken } from '$eth/utils/token.utils';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { i18n } from '$lib/stores/i18n.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Network } from '$lib/types/network';
import type {
	Address,
	OpenCryptoPayResponse,
	PayableToken,
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees,
	PaymentMethodData,
	PrepareTokensParams,
	ValidatedDFXPaymentData
} from '$lib/types/open-crypto-pay';
import type { DecodedUrn } from '$lib/types/qr-code';
import type { Token } from '$lib/types/token';
import { isEthAddress } from '$lib/utils/account.utils';
import { isNetworkEthereum, isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';
import { isEmptyString, isNullish, nonNullish } from '@dfinity/utils';
import { decode, fromWords } from 'bech32';
import Decimal from 'decimal.js';
import { get } from 'svelte/store';

/**
 * Decodes LNURL according to LNURL-01 standard
 *
 * LNURL is a bech32-encoded URL with "lnurl" prefix.
 * Decoding process:
 * 1. Decode bech32 (converts from base32 to 5-bit words)
 * 2. Convert 5-bit words to 8-bit bytes
 * 3. Decode bytes to UTF-8 string (URL)
 *
 * @param lnurl - LNURL string (e.g., "LNURL1DP68GURN8GHJ7...")
 * @returns Decoded URL string
 * @throws {Error} If LNURL is invalid or decoding failed
 *
 */
export const decodeLNURL = (lnurl: string): string => {
	const { words } = decode(lnurl, 2000);
	const bytes = fromWords(words);

	const url = new TextDecoder().decode(new Uint8Array(bytes));

	return url;
};

export const formatAddress = (address?: Address): string => {
	if (isNullish(address)) {
		return '-';
	}

	const parts: string[] = [];

	const streetParts = [address.street, address.houseNumber].filter(Boolean);
	if (streetParts.length > 0) {
		parts.push(streetParts.join(' '));
	}

	const cityParts = [address.zip, address.city].filter(Boolean);
	if (cityParts.length > 0) {
		parts.push(cityParts.join(' '));
	}

	return parts.length > 0 ? parts.join(', ') : '-';
};

export const createPaymentMethodDataMap = ({
	transferAmounts,
	networks
}: {
	transferAmounts: OpenCryptoPayResponse['transferAmounts'];
	networks: Network[];
}): Map<string, PaymentMethodData> => {
	const supportedMethods = networks.reduce<Set<string>>((acc, { pay }) => {
		if (nonNullish(pay?.openCryptoPay)) {
			acc.add(pay.openCryptoPay);
		}
		return acc;
	}, new Set());

	if (supportedMethods.size === 0) {
		return new Map();
	}

	return transferAmounts.reduce<Map<string, PaymentMethodData>>(
		(acc, { method, assets, minFee, available }) => {
			if (available && assets.length > 0 && supportedMethods.has(method)) {
				acc.set(method, {
					assets: new Map(assets.map(({ asset, amount }) => [asset, { amount }])),
					minFee
				});
			}
			return acc;
		},
		new Map()
	);
};

export const mapTokenToPayableToken = ({
	token,
	methodDataMap
}: {
	token: Token;
	methodDataMap: Map<string, PaymentMethodData>;
}): PayableToken | undefined => {
	const tokenNetwork = token.network.pay?.openCryptoPay;

	if (isNullish(tokenNetwork)) {
		return;
	}

	const methodData = methodDataMap.get(tokenNetwork);

	if (isNullish(methodData)) {
		return;
	}

	// We check token.symbol because OpenCryptoPay identifies assets by their symbol,
	// not by token IDs or contract addresses. This can lead to issues if multiple tokens share the same symbol and the same network. Careful mapping is required.
	const assetData = methodData.assets.get(token.symbol);

	if (isNullish(assetData)) {
		return;
	}

	return {
		...token,
		amount: assetData.amount,
		tokenNetwork,
		minFee: methodData.minFee
	};
};

export const prepareBasePayableTokens = ({
	transferAmounts,
	networks,
	availableTokens
}: PrepareTokensParams): PayableToken[] => {
	if (transferAmounts.length === 0 || networks.length === 0 || availableTokens.length === 0) {
		return [];
	}

	const methodDataMap = createPaymentMethodDataMap({
		transferAmounts,
		networks
	});

	return availableTokens.reduce<PayableToken[]>((acc, token) => {
		const payableToken = mapTokenToPayableToken({ token, methodDataMap });
		if (nonNullish(payableToken)) {
			acc.push(payableToken);
		}
		return acc;
	}, []);
};

/**
 * Routes token enrichment to appropriate network-specific handler.
 * Currently supports:
 * - Ethereum/EVM networks
 *
 * Future support:
 * - Bitcoin
 * - ICP
 * - Solana
 *
 * @param token - Token with fee data to enrich
 * @param nativeTokens - Available tokens for native token lookup
 * @param exchanges - Exchange rates for price lookup
 * @param balances - User token balances
 */
const enrichTokenWithUsdAndBalance = ({
	token,
	nativeTokens,
	exchanges,
	balances
}: {
	token: PayableTokenWithFees;
	nativeTokens: Token[];
	exchanges: ExchangesData;
	balances: CertifiedStoreData<BalancesData>;
}): PayableTokenWithConvertedAmount | undefined => {
	if (isNullish(token.fee)) {
		return;
	}

	// ETH/EVM networks
	if (isNetworkIdEthereum(token.network.id) || isNetworkIdEvm(token.network.id)) {
		return enrichEthEvmToken({
			token,
			nativeTokens,
			exchanges,
			balances
		});
	}
};

export const enrichTokensWithUsdAndBalance = ({
	tokens,
	nativeTokens,
	exchanges,
	balances
}: {
	tokens: PayableTokenWithFees[];
	nativeTokens: Token[];
	exchanges: ExchangesData;
	balances: CertifiedStoreData<BalancesData>;
}): PayableTokenWithConvertedAmount[] =>
	tokens.reduce<PayableTokenWithConvertedAmount[]>((acc, token) => {
		const enrichedToken = enrichTokenWithUsdAndBalance({
			token,
			nativeTokens,
			exchanges,
			balances
		});

		if (nonNullish(enrichedToken)) {
			acc.push(enrichedToken);
		}

		return acc;
	}, []);

export const extractQuoteData = (data: OpenCryptoPayResponse) => {
	if (isNullish(data.quote) || isNullish(data.callback)) {
		throw new Error('Invalid OpenCryptoPay response data');
	}

	return {
		quoteId: data.quote.id,
		callback: data.callback
	};
};

export const validateDecodedData = ({
	decodedData,
	token,
	amount,
	uri
}: {
	decodedData: DecodedUrn | undefined;
	token: PayableTokenWithConvertedAmount;
	amount: bigint;
	uri: string;
}): ValidatedDFXPaymentData => {
	const { feeData, estimatedGasLimit } = token.fee ?? {};

	if (
		isNullish(feeData?.maxFeePerGas) ||
		isNullish(feeData?.maxPriorityFeePerGas) ||
		isNullish(estimatedGasLimit) ||
		isNullish(decodedData)
	) {
		throw new Error(get(i18n).scanner.error.data_is_incompleted);
	}

	const params = {
		decodedData,
		amount,
		maxFeePerGas: feeData.maxFeePerGas,
		maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
		estimatedGasLimit,
		token,
		uri
	};

	return isDefaultEthereumToken(token)
		? validateNativeTransfer(params)
		: validateERC20Transfer(params);
};

export const getERC681Value = (uri: string): bigint | undefined => {
	try {
		const params = new URLSearchParams(uri.split('?')[1] || '');
		const value = params.get('value') ?? params.get('uint256');

		if (isEmptyString(value)) {
			return;
		}

		if (value.includes('e') || value.includes('E') || value.includes('.')) {
			const decimal = new Decimal(value);

			if (!decimal.isFinite()) {
				return;
			}

			return BigInt(decimal.toString());
		}

		return BigInt(value);
	} catch (_: unknown) {
		// If it is not parseable, we can handle a nullish value
	}
};

export const validateNativeTransfer = ({
	decodedData,
	amount,
	maxFeePerGas,
	maxPriorityFeePerGas,
	estimatedGasLimit,
	token,
	uri
}: {
	decodedData: DecodedUrn;
	amount: bigint;
	token: PayableTokenWithConvertedAmount;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	estimatedGasLimit: bigint;
	uri: string;
}): ValidatedDFXPaymentData => {
	const { functionName, destination } = decodedData;
	const dfxValue = getERC681Value(uri);

	const {
		pay: {
			error: { data_is_incompleted, amount_does_not_match, recipient_address_is_not_valid }
		}
	} = get(i18n);

	if (
		!isNetworkEthereum(token.network) ||
		isNullish(destination) ||
		nonNullish(functionName) ||
		isNullish(dfxValue)
	) {
		throw new Error(data_is_incompleted);
	}

	if (amount !== dfxValue) {
		throw new Error(amount_does_not_match);
	}

	if (!isEthAddress(destination)) {
		throw new Error(recipient_address_is_not_valid);
	}

	return {
		destination,
		feeData: {
			maxFeePerGas,
			maxPriorityFeePerGas
		},
		estimatedGasLimit,
		value: amount,
		ethereumChainId: token.network.chainId
	};
};

export const validateERC20Transfer = ({
	decodedData,
	token,
	amount,
	maxFeePerGas,
	maxPriorityFeePerGas,
	estimatedGasLimit,
	uri
}: {
	decodedData: DecodedUrn;
	token: PayableTokenWithConvertedAmount;
	amount: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	estimatedGasLimit: bigint;
	uri: string;
}): ValidatedDFXPaymentData => {
	const { destination, address } = decodedData;
	const dfxValue = getERC681Value(uri);

	const {
		pay: {
			error: {
				data_is_incompleted,
				amount_does_not_match,
				recipient_address_is_not_valid,
				token_address_mismatch
			}
		}
	} = get(i18n);

	if (!isTokenErc20(token) || isNullish(destination) || isNullish(address) || isNullish(dfxValue)) {
		throw new Error(data_is_incompleted);
	}

	const tokenContractAddress = token.address.toLowerCase();
	const urnContractAddress = destination.toLowerCase();

	if (tokenContractAddress !== urnContractAddress) {
		throw new Error(token_address_mismatch);
	}

	if (amount !== dfxValue) {
		throw new Error(amount_does_not_match);
	}

	if (!isEthAddress(address)) {
		throw new Error(recipient_address_is_not_valid);
	}

	return {
		destination: address,
		feeData: {
			maxFeePerGas,
			maxPriorityFeePerGas
		},
		estimatedGasLimit,
		ethereumChainId: token.network.chainId,
		value: amount
	};
};
