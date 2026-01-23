import { nonNullish } from '@dfinity/utils';

// Kaspa address prefixes
const KASPA_MAINNET_PREFIX = 'kaspa:';
const KASPA_TESTNET_PREFIX = 'kaspatest:';
const KASPA_DEVNET_PREFIX = 'kaspadev:';
const KASPA_SIMNET_PREFIX = 'kaspasim:';

// Valid Kaspa address prefixes
const KASPA_PREFIXES = [
	KASPA_MAINNET_PREFIX,
	KASPA_TESTNET_PREFIX,
	KASPA_DEVNET_PREFIX,
	KASPA_SIMNET_PREFIX
];

/**
 * Check if a string is a valid Kaspa address format.
 * Kaspa addresses use Bech32 encoding with a kaspa: prefix.
 * Format: kaspa:qr...  or kaspatest:qr... etc.
 */
export const isKaspaAddress = ({ address }: { address: string | undefined }): boolean => {
	if (!nonNullish(address) || address.length === 0) {
		return false;
	}

	// Check if address starts with a valid Kaspa prefix
	const hasValidPrefix = KASPA_PREFIXES.some((prefix) => address.toLowerCase().startsWith(prefix));

	if (!hasValidPrefix) {
		return false;
	}

	// Extract the part after the prefix
	const prefix = KASPA_PREFIXES.find((p) => address.toLowerCase().startsWith(p));
	if (!prefix) {
		return false;
	}

	const addressBody = address.slice(prefix.length);

	// Kaspa addresses (after prefix) should be:
	// - At least 61 characters for P2PK addresses (q prefix + 60 chars)
	// - Start with 'q' for P2PK (pay-to-public-key) or 'p' for P2SH (pay-to-script-hash)
	if (addressBody.length < 61) {
		return false;
	}

	const firstChar = addressBody.charAt(0).toLowerCase();
	if (firstChar !== 'q' && firstChar !== 'p') {
		return false;
	}

	// Bech32 valid characters (excluding 1, b, i, o)
	const bech32Chars = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/i;
	if (!bech32Chars.test(addressBody)) {
		return false;
	}

	return true;
};

/**
 * Parse a Kaspa address string and return it if valid, otherwise undefined.
 */
export const parseKaspaAddress = (address: string): string | undefined => {
	if (isKaspaAddress({ address })) {
		return address;
	}
	return undefined;
};

/**
 * Get the network type from a Kaspa address.
 */
export const getKaspaNetworkFromAddress = (
	address: string
): 'mainnet' | 'testnet' | 'devnet' | 'simnet' | undefined => {
	const lowerAddress = address.toLowerCase();

	if (lowerAddress.startsWith(KASPA_MAINNET_PREFIX)) {
		return 'mainnet';
	}
	if (lowerAddress.startsWith(KASPA_TESTNET_PREFIX)) {
		return 'testnet';
	}
	if (lowerAddress.startsWith(KASPA_DEVNET_PREFIX)) {
		return 'devnet';
	}
	if (lowerAddress.startsWith(KASPA_SIMNET_PREFIX)) {
		return 'simnet';
	}

	return undefined;
};
