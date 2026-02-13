import { enrichBtcPayableToken, validateBtcTransfer } from '$btc/utils/btc-open-crypto-pay.utils';
import { isBitcoinToken } from '$btc/utils/token.utils';
import { OCP_PAY_WITH_BTC_ENABLED } from '$env/open-crypto-pay.env';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import {
	enrichEthEvmPayableToken,
	validateEthEvmTransfer
} from '$eth/utils/eth-open-crypto-pay.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { getPendingTransactions } from '$icp/utils/btc.utils';
import { PLAUSIBLE_EVENT_CONTEXTS, PLAUSIBLE_EVENT_EVENTS_KEYS } from '$lib/enums/plausible';
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
	ValidatedBtcPaymentData,
	ValidatedEthPaymentData
} from '$lib/types/open-crypto-pay';
import type { DecodedUrn } from '$lib/types/qr-code';
import type { Token } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
import { decode, fromWords } from 'bech32';
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
	availableTokens,
	btcAddressMainnet
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
			if (isBitcoinToken(payableToken)) {
				if (!OCP_PAY_WITH_BTC_ENABLED) {
					return acc;
				}

				const btcPendingSentTransactions = getPendingTransactions(btcAddressMainnet ?? '');

				if (nonNullish(btcPendingSentTransactions) && btcPendingSentTransactions.length === 0) {
					acc.push(payableToken);
				}
			} else {
				acc.push(payableToken);
			}
		}
		return acc;
	}, []);
};

/**
 * Routes token enrichment to appropriate network-specific handler.
 * Currently, supports:
 * - Bitcoin
 * - Ethereum/EVM networks
 *
 * Future support:
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

	if (isBitcoinToken(token)) {
		return enrichBtcPayableToken({
			token,
			exchanges,
			balances
		});
	}

	if (isDefaultEthereumToken(token) || isTokenErc20(token)) {
		return enrichEthEvmPayableToken({
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
}): ValidatedEthPaymentData | ValidatedBtcPaymentData | undefined => {
	if (isNullish(decodedData)) {
		throw new Error(get(i18n).scanner.error.data_is_incompleted);
	}

	if (isBitcoinToken(token)) {
		return validateBtcTransfer({
			decodedData,
			amount,
			token
		});
	}

	if (isDefaultEthereumToken(token) || isTokenErc20(token)) {
		return validateEthEvmTransfer({ decodedData, amount, token, uri });
	}
};

export const getPaymentUri = ({
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

export const getOpenCryptoPayBaseTrackingParams = ({
	token,
	providerData
}: {
	token?: PayableTokenWithConvertedAmount;
	providerData?: OpenCryptoPayResponse;
}) => ({
	event_context: PLAUSIBLE_EVENT_CONTEXTS.OPEN_CRYPTOPAY,
	event_subcontext: PLAUSIBLE_EVENT_CONTEXTS.DFX,
	event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.PRICE,
	...(nonNullish(providerData) && {
		event_value: `${providerData.requestedAmount.amount} ${providerData.requestedAmount.asset}`
	}),
	...(nonNullish(token) && {
		token_symbol: token.symbol,
		token_network: token.network.name,
		token_name: token.name,
		token_standard: token.standard.code,
		token_id: `${token.id.toString()}`,
		token_usd_value: `${token.amountInUSD}`,
		...(isTokenErc20(token) && {
			token_address: token.address
		})
	})
});
