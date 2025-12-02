import type { Network } from '$lib/types/network';
import type {
	Address,
	OpenCryptoPayResponse,
	PayableToken,
	PaymentMethodData
} from '$lib/types/open-crypto-pay';
import type { Token } from '$lib/types/token';
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
}): Partial<PayableToken> | undefined => {
	const tokenNetwork = token.network.pay?.openCryptoPay;

	if (isNullish(tokenNetwork)) {
		return;
	}

	const methodData = methodDataMap.get(tokenNetwork);

	if (isNullish(methodData)) {
		return;
	}

	// We check token.symbol because OpenCryptoPay identifies assets by their symbol,
	// not by token IDs or contract addresses.
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
