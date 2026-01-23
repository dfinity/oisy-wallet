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
import { get } from 'svelte/store';

// @kaspa/core-lib doesn't have TypeScript types, so we declare the minimal interface we need
interface KaspaCorePublicKey {
	toBuffer(): Buffer;
}

interface KaspaCoreAddress {
	toString(): string;
}

interface KaspaCoreLib {
	initRuntime(): Promise<boolean>;
	PublicKey: new (data: Buffer | Uint8Array | string) => KaspaCorePublicKey;
	Address: {
		fromPublicKey(pubkey: KaspaCorePublicKey, network: string): KaspaCoreAddress;
	};
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const kaspacore: KaspaCoreLib = require('@kaspa/core-lib');

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

// Track if kaspa-core-lib runtime is initialized
let kaspaRuntimeReady = false;
let kaspaRuntimePromise: Promise<boolean> | null = null;

/**
 * Initialize kaspa-core-lib WASM runtime.
 * Must be called before using PublicKey or Address classes.
 */
const ensureKaspaRuntime = async (): Promise<void> => {
	if (kaspaRuntimeReady) {
		return;
	}

	if (!kaspaRuntimePromise) {
		kaspaRuntimePromise = kaspacore.initRuntime();
	}

	await kaspaRuntimePromise;
	kaspaRuntimeReady = true;
};

/**
 * Convert a secp256k1 public key to a Kaspa address.
 * Uses @kaspa/core-lib for proper Bech32 address derivation.
 *
 * @param publicKey - Compressed secp256k1 public key (33 bytes with 0x02 or 0x03 prefix)
 * @param network - 'mainnet' or 'testnet'
 * @returns Kaspa address string (e.g., kaspa:qr...)
 */
const publicKeyToKaspaAddress = async (
	publicKey: Uint8Array,
	network: KaspaNetworkType
): Promise<KaspaAddress> => {
	// Ensure WASM runtime is initialized
	await ensureKaspaRuntime();

	// Map network type to kaspa-core-lib network name
	const kaspaNetwork = network === 'mainnet' ? 'kaspa' : 'kaspatest';

	// Create PublicKey from the compressed public key buffer (DER format)
	// The public key from tECDSA is in compressed format (33 bytes)
	const pubKey = new kaspacore.PublicKey(publicKey);

	// Create Address from PublicKey with the specified network
	const address = kaspacore.Address.fromPublicKey(pubKey, kaspaNetwork);

	// Return the Bech32 encoded address string
	return address.toString() as KaspaAddress;
};

/**
 * Get Kaspa address from the signer canister using generic ECDSA.
 * Uses threshold ECDSA for secure key derivation and @kaspa/core-lib for address generation.
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

	// Convert the public key to a Kaspa address using kaspa-core-lib
	return await publicKeyToKaspaAddress(new Uint8Array(publicKey), network);
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
