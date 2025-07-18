import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_KEY_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import {
	getIdbSolAddressMainnet,
	setIdbSolAddressDevnet,
	setIdbSolAddressLocal,
	setIdbSolAddressMainnet,
	updateIdbSolAddressMainnetLastUsage
} from '$lib/api/idb-addresses.api';
import { getSchnorrPublicKey } from '$lib/api/signer.api';
import { deriveSolAddress } from '$lib/ic-pub-key/src/cli';
import {
	certifyAddress,
	loadIdbTokenAddress,
	loadTokenAddress,
	validateAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	type AddressStoreData
} from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import type { SolAddress } from '$lib/types/address';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { LoadIdbAddressError } from '$lib/types/errors';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import { assertNonNullish } from '@dfinity/utils';
import { getAddressDecoder } from '@solana/kit';
import { get } from 'svelte/store';

const getSolanaPublicKey = async ({
	derivationPath,
	identity,
	...rest
}: CanisterApiFunctionParams<{ derivationPath: string[] }>): Promise<Uint8Array | number[]> => {
	if (FRONTEND_DERIVATION_ENABLED) {
		// We use the same logic of the canister method. The potential error will be handled in the consumer.
		assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

		// HACK: This is working right now ONLY in Beta and Prod because the library is aware of the production Chain Fusion Signer's public key (used by both envs), but not for the staging Chain Fusion Signer (used by all other envs).
		const publicKey = await deriveSolAddress(identity.getPrincipal().toString(), [
			SOLANA_DERIVATION_PATH_PREFIX,
			...derivationPath
		]);

		return Buffer.from(publicKey, 'hex');
	}

	return await getSchnorrPublicKey({
		...rest,
		identity,
		keyId: SOLANA_KEY_ID,
		derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, ...derivationPath]
	});
};

const getSolAddress = async ({
	identity,
	network
}: {
	identity: OptionIdentity;
	network: SolanaNetworkType;
}): Promise<SolAddress> => {
	const derivationPath: string[] = [network];
	const publicKey = await getSolanaPublicKey({ identity, derivationPath });
	const decoder = getAddressDecoder();
	return decoder.decode(Uint8Array.from(publicKey));
};

export const getSolAddressMainnet = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, network: SolanaNetworks.mainnet });

export const getSolAddressDevnet = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, network: SolanaNetworks.devnet });

export const getSolAddressLocal = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, network: SolanaNetworks.local });

const solanaMapper: Record<
	SolanaNetworkType,
	Pick<LoadTokenAddressParams<SolAddress>, 'addressStore' | 'setIdbAddress' | 'getAddress'>
> = {
	mainnet: {
		addressStore: solAddressMainnetStore,
		getAddress: getSolAddressMainnet,
		setIdbAddress: setIdbSolAddressMainnet
	},
	devnet: {
		addressStore: solAddressDevnetStore,
		getAddress: getSolAddressDevnet,
		setIdbAddress: setIdbSolAddressDevnet
	},
	local: {
		addressStore: solAddressLocalnetStore,
		getAddress: getSolAddressLocal,
		setIdbAddress: setIdbSolAddressLocal
	}
};

const loadSolAddress = ({
	networkId,
	network
}: {
	networkId: NetworkId;
	network: SolanaNetworkType;
}): Promise<ResultSuccess> =>
	loadTokenAddress<SolAddress>({
		networkId,
		...solanaMapper[network]
	});

export const loadSolAddressMainnet = (): Promise<ResultSuccess> =>
	loadSolAddress({
		networkId: SOLANA_MAINNET_NETWORK_ID,
		network: SolanaNetworks.mainnet
	});

export const loadSolAddressDevnet = (): Promise<ResultSuccess> =>
	loadSolAddress({
		networkId: SOLANA_DEVNET_NETWORK_ID,
		network: SolanaNetworks.devnet
	});

export const loadSolAddressLocal = (): Promise<ResultSuccess> =>
	loadSolAddress({
		networkId: SOLANA_LOCAL_NETWORK_ID,
		network: SolanaNetworks.local
	});

export const loadIdbSolAddressMainnet = (): Promise<ResultSuccess<LoadIdbAddressError>> =>
	loadIdbTokenAddress<SolAddress>({
		networkId: SOLANA_MAINNET_NETWORK_ID,
		getIdbAddress: getIdbSolAddressMainnet,
		updateIdbAddressLastUsage: updateIdbSolAddressMainnetLastUsage,
		addressStore: solAddressMainnetStore
	});

const certifySolAddressMainnet = (address: SolAddress): Promise<ResultSuccess<string>> =>
	certifyAddress<SolAddress>({
		networkId: SOLANA_MAINNET_NETWORK_ID,
		address,
		getAddress: (identity: OptionIdentity) => getSolAddressMainnet(identity),
		updateIdbAddressLastUsage: updateIdbSolAddressMainnetLastUsage,
		addressStore: solAddressMainnetStore
	});

export const validateSolAddressMainnet = async ($addressStore: AddressStoreData<SolAddress>) =>
	await validateAddress<SolAddress>({
		$addressStore,
		certifyAddress: certifySolAddressMainnet
	});
