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
	type StorageAddressData
} from '$lib/stores/address.store';
import type { SolAddress } from '$lib/types/address';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { LoadIdbAddressError } from '$lib/types/errors';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import { getAddressDecoder } from '@solana/kit';

const getSolanaPublicKey = async (
	params: CanisterApiFunctionParams<{ derivationPath: string[] }>
): Promise<Uint8Array | number[]> =>
	await getSchnorrPublicKey({
		...params,
		keyId: SOLANA_KEY_ID,
		derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, ...params.derivationPath]
	});

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

export const validateSolAddressMainnet = async ($addressStore: StorageAddressData<SolAddress>) =>
	await validateAddress<SolAddress>({
		$addressStore,
		certifyAddress: certifySolAddressMainnet
	});
