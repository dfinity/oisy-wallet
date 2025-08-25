import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_KEY_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import {
	getIdbSolAddressMainnet,
	setIdbSolAddressDevnet,
	setIdbSolAddressLocal,
	setIdbSolAddressMainnet,
	setIdbSolAddressTestnet,
	updateIdbSolAddressMainnetLastUsage
} from '$lib/api/idb.api';
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
	solAddressTestnetStore,
	type StorageAddressData
} from '$lib/stores/address.store';
import type { SolAddress } from '$lib/types/address';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { LoadIdbAddressError } from '$lib/types/errors';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import { getAddressDecoder } from '@solana/addresses';

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
	derivationPath
}: {
	identity: OptionIdentity;
	derivationPath: string[];
}): Promise<SolAddress> => {
	const publicKey = await getSolanaPublicKey({ identity, derivationPath });
	const decoder = getAddressDecoder();
	return decoder.decode(Uint8Array.from(publicKey));
};

export const getSolAddressMainnet = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, derivationPath: [SolanaNetworks.mainnet] });

export const getSolAddressTestnet = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, derivationPath: [SolanaNetworks.testnet] });

export const getSolAddressDevnet = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, derivationPath: [SolanaNetworks.devnet] });

export const getSolAddressLocal = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, derivationPath: [SolanaNetworks.local] });

const solanaMapper: Record<
	SolanaNetworkType,
	Pick<LoadTokenAddressParams<SolAddress>, 'addressStore' | 'setIdbAddress' | 'getAddress'>
> = {
	mainnet: {
		addressStore: solAddressMainnetStore,
		getAddress: getSolAddressMainnet,
		setIdbAddress: setIdbSolAddressMainnet
	},
	testnet: {
		addressStore: solAddressTestnetStore,
		getAddress: getSolAddressTestnet,
		setIdbAddress: setIdbSolAddressTestnet
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
	tokenId,
	network
}: {
	tokenId: TokenId;
	network: SolanaNetworkType;
}): Promise<ResultSuccess> =>
	loadTokenAddress<SolAddress>({
		tokenId,
		...solanaMapper[network]
	});

export const loadSolAddressMainnet = (): Promise<ResultSuccess> =>
	loadSolAddress({
		tokenId: SOLANA_MAINNET_NETWORK_ID as unknown as TokenId,
		network: SolanaNetworks.mainnet
	});

export const loadSolAddressTestnet = (): Promise<ResultSuccess> =>
	loadSolAddress({
		tokenId: SOLANA_MAINNET_NETWORK_ID as unknown as TokenId,
		network: SolanaNetworks.testnet
	});

export const loadSolAddressDevnet = (): Promise<ResultSuccess> =>
	loadSolAddress({
		tokenId: SOLANA_DEVNET_NETWORK_ID as unknown as TokenId,
		network: SolanaNetworks.devnet
	});

export const loadSolAddressLocal = (): Promise<ResultSuccess> =>
	loadSolAddress({
		tokenId: SOLANA_LOCAL_NETWORK_ID as unknown as TokenId,
		network: SolanaNetworks.local
	});

export const loadIdbSolAddressMainnet = (): Promise<ResultSuccess<LoadIdbAddressError>> =>
	loadIdbTokenAddress<SolAddress>({
		tokenId: SOLANA_TOKEN_ID,
		getIdbAddress: getIdbSolAddressMainnet,
		updateIdbAddressLastUsage: updateIdbSolAddressMainnetLastUsage,
		addressStore: solAddressMainnetStore
	});

const certifySolAddressMainnet = (address: SolAddress): Promise<ResultSuccess<string>> =>
	certifyAddress<SolAddress>({
		tokenId: SOLANA_TOKEN_ID,
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
