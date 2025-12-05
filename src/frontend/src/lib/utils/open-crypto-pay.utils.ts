import { EthAddressObjectSchema } from '$eth/schema/address.schema';
import { enrichEthEvmToken } from '$eth/utils/token.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Network } from '$lib/types/network';
import type {
	Address,
	EthereumPaymentRequest,
	OpenCryptoPayResponse,
	PayableToken,
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees,
	PaymentMethodData,
	PrepareTokensParams
} from '$lib/types/open-crypto-pay';
import type { Token } from '$lib/types/token';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { decode, fromWords } from 'bech32';

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

/**
 * Parses EIP-681 Ethereum URI with validation
 * Format: ethereum:<address>[@<chainId>][?value=<amount>&...]
 */
export const parseEthereumUri = (uri: string): EthereumPaymentRequest | undefined => {
	try {
		// URI must start with the Ethereum scheme
		if (!uri.startsWith('ethereum:')) {
			return;
		}

		// Remove "ethereum:" prefix
		const withoutScheme = uri.slice(9);

		if (isNullishOrEmpty(withoutScheme)) {
			return;
		}

		const [addressPart, queryString] = withoutScheme.split('?');
		const [address, chainIdString] = addressPart.split('@');

		// Validate Ethereum address format
		const { success: isValidEthereumAddress } = EthAddressObjectSchema.safeParse(address);

		if (!isValidEthereumAddress) {
			return;
		}

		if (isNullishOrEmpty(chainIdString)) {
			return;
		}

		const chainId = parseInt(chainIdString, 10);

		if (isNaN(chainId) || chainId < 0) {
			return;
		}

		if (isNullishOrEmpty(queryString)) {
			return;
		}

		const params = new URLSearchParams(queryString);
		const valueParam = params.get('value');

		if (isNullishOrEmpty(valueParam)) {
			return;
		}

		// Ensure value contains only digits (prevents BigInt errors)
		if (!/^\d+$/.test(valueParam)) {
			return;
		}

		// Reject negative values (should never occur but safe to check)
		const value = BigInt(valueParam);

		if (value < ZERO) {
			return;
		}

		return { address, chainId, value };
	} catch (err: unknown) {
		// Future improvement: add error event
		console.warn('Error parsing Ethereum URI:', err);
	}
};
