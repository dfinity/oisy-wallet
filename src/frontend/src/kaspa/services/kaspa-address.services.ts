import type { KaspaAddress } from '$kaspa/types/address';
import {
	KASPA_MAINNET_NETWORK_ID,
	KASPA_TESTNET_NETWORK_ID
} from '$env/networks/networks.kaspa.env';
import { getGenericEcdsaPublicKey } from '$lib/api/signer.api';
import {
	kaspaAddressMainnet,
	kaspaAddressTestnet
} from '$lib/derived/address.derived';
import {
	loadTokenAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import {
	kaspaAddressMainnetStore,
	kaspaAddressTestnetStore
} from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { isNetworkIdKASTestnet } from '$lib/utils/network.utils';
import { assertNonNullish } from '@dfinity/utils';
import { encodeKaspaAddress, toWords } from '$kaspa/utils/kaspa-bech32.utils';
import { get } from 'svelte/store';

// Kaspa uses secp256k1, same as Bitcoin
const KASPA_ECDSA_KEY_ID = {
	name: 'dfx_test_key', // This should be configurable based on environment
	curve: { secp256k1: null } as const
};

// Derivation path for Kaspa - using a unique identifier to separate from BTC/ETH
const KASPA_DERIVATION_PATH_MAINNET = ['kaspa', 'mainnet'];
const KASPA_DERIVATION_PATH_TESTNET = ['kaspa', 'testnet'];

type KaspaNetworkType = 'mainnet' | 'testnet';

const kaspaMapper: Record<
	KaspaNetworkType,
	Pick<LoadTokenAddressParams<KaspaAddress>, 'addressStore' | 'setIdbAddress'>
> = {
	mainnet: {
		addressStore: kaspaAddressMainnetStore,
		setIdbAddress: null // TODO: Add IDB persistence if needed
	},
	testnet: {
		addressStore: kaspaAddressTestnetStore,
		setIdbAddress: null
	}
};

// Kaspa address type constants (matching kaspa Motoko library)
// SCHNORR = 0 (32-byte public key)
// ECDSA = 1 (33-byte compressed public key)
// P2SH = 8
const KASPA_ADDRESS_TYPE_ECDSA = 1;

/**
 * Convert a secp256k1 public key to a Kaspa address.
 * Uses pure JavaScript implementation with bech32.
 *
 * Kaspa address format (for ECDSA pubkey addresses):
 * - HRP: "kaspa" (mainnet) or "kaspatest" (testnet)
 * - Data: [address_type (1 byte)] + [compressed public key (33 bytes)]
 * - Encoding: bech32
 *
 * Note: Kaspa P2PK addresses encode the full compressed public key,
 * not a hash of it. This is different from Bitcoin.
 *
 * @param publicKey - Compressed secp256k1 public key (33 bytes with 0x02 or 0x03 prefix)
 * @param network - 'mainnet' or 'testnet'
 * @returns Kaspa address string (e.g., kaspa:qr...)
 */
const publicKeyToKaspaAddress = (
	publicKey: Uint8Array,
	network: KaspaNetworkType
): KaspaAddress => {
	// Validate public key length (compressed = 33 bytes)
	if (publicKey.length !== 33) {
		throw new Error(`Invalid public key length: expected 33, got ${publicKey.length}`);
	}

	// Build the address payload: [type (1 byte)] + [public key (33 bytes)]
	const payload = new Uint8Array(34);
	payload[0] = KASPA_ADDRESS_TYPE_ECDSA;
	payload.set(publicKey, 1);

	// Convert payload to 5-bit words for Kaspa bech32 encoding
	const words = toWords(payload);

	// Select HRP based on network
	const hrp = network === 'mainnet' ? 'kaspa' : 'kaspatest';

	// Encode using Kaspa-specific bech32 (with ':' separator and custom checksum)
	const address = encodeKaspaAddress(hrp, words);

	return address as KaspaAddress;
};

/**
 * Get Kaspa address from the signer canister using generic ECDSA.
 * Uses threshold ECDSA for secure key derivation and pure JS for address generation.
 */
export const getKaspaAddress = async ({
	identity,
	network
}: {
	identity: OptionIdentity;
	network: KaspaNetworkType;
}): Promise<KaspaAddress> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const derivationPath =
		network === 'mainnet' ? KASPA_DERIVATION_PATH_MAINNET : KASPA_DERIVATION_PATH_TESTNET;

	const { publicKey } = await getGenericEcdsaPublicKey({
		identity,
		derivationPath,
		keyId: KASPA_ECDSA_KEY_ID
	});

	// Convert the public key to a Kaspa address using pure JS
	return publicKeyToKaspaAddress(new Uint8Array(publicKey), network);
};

const loadKaspaAddress = ({
	networkId,
	network
}: {
	networkId: NetworkId;
	network: KaspaNetworkType;
}): Promise<ResultSuccess> =>
	loadTokenAddress<KaspaAddress>({
		networkId,
		getAddress: (identity: OptionIdentity) => getKaspaAddress({ identity, network }),
		...kaspaMapper[network]
	});

export const loadKaspaAddressTestnet = (): Promise<ResultSuccess> =>
	loadKaspaAddress({
		networkId: KASPA_TESTNET_NETWORK_ID,
		network: 'testnet'
	});

export const loadKaspaAddressMainnet = (): Promise<ResultSuccess> =>
	loadKaspaAddress({
		networkId: KASPA_MAINNET_NETWORK_ID,
		network: 'mainnet'
	});

/**
 * Get the Kaspa source address for a given network ID
 */
export const getKaspaSourceAddress = (networkId: NetworkId | undefined): string =>
	(isNetworkIdKASTestnet(networkId) ? get(kaspaAddressTestnet) : get(kaspaAddressMainnet)) ?? '';
