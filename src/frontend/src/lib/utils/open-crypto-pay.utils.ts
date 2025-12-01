import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import type { Network } from '$lib/types/network';
import type { Address } from '$lib/types/open-crypto-pay';
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

const NETWORK_NAME_EXCEPTIONS: Readonly<Record<Network['name'], string>> = {
	[BSC_MAINNET_NETWORK.name]: 'BinanceSmartChain'
} as const;

const getPaymentMethodFromNetwork = (networkName: Network['name']): string =>
	NETWORK_NAME_EXCEPTIONS[networkName] ?? networkName;

export const buildSupportedNetworks = (networks: Network[]): Set<string> =>
	networks.reduce<Set<string>>((acc, { name }) => {
		const method = getPaymentMethodFromNetwork(name);

		if (nonNullish(method)) {
			acc.add(method);
		}

		return acc;
	}, new Set());
