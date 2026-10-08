import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_KEY_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import { getSchnorrPublicKey } from '$lib/api/signer.api';
import { deriveSolAddress } from '$lib/ic-pub-key/src/cli';
import {
	deriveTokenAddress,
	loadTokenAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import { getAddressDecoder } from '@solana/kit';

const getSolanaPublicKey = async ({
	derivationPath,
	identity,
	...rest
}: CanisterApiFunctionParams<{ derivationPath: string[] }>): Promise<Uint8Array> =>
	await deriveTokenAddress<Uint8Array>({
		identity,
		deriveAddress: ({ user, masterPubKey }) => {
			const publicKey = deriveSolAddress({
				user,
				derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, ...derivationPath],
				pubkey: masterPubKey.schnorr.ed25519.pubkey
			});

			return Buffer.from(publicKey, 'hex');
		},
		getSignerAddress: () =>
			getSchnorrPublicKey({
				...rest,
				identity,
				keyId: SOLANA_KEY_ID,
				derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, ...derivationPath]
			})
	});

const getSolAddress = async ({
	identity,
	network
}: {
	identity: NullishIdentity;
	network: SolanaNetworkType;
}): Promise<SolAddress> => {
	const derivationPath: string[] = [network];
	const publicKey = await getSolanaPublicKey({ identity, derivationPath });
	const decoder = getAddressDecoder();
	return decoder.decode(Uint8Array.from(publicKey));
};

export const getSolAddressMainnet = async (identity: NullishIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, network: SolanaNetworks.mainnet });

export const getSolAddressDevnet = async (identity: NullishIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, network: SolanaNetworks.devnet });

export const getSolAddressLocal = async (identity: NullishIdentity): Promise<SolAddress> =>
	await getSolAddress({ identity, network: SolanaNetworks.local });

const solanaMapper: Record<
	SolanaNetworkType,
	Pick<LoadTokenAddressParams<SolAddress>, 'addressStore' | 'getAddress'>
> = {
	mainnet: {
		addressStore: solAddressMainnetStore,
		getAddress: getSolAddressMainnet
	},
	devnet: {
		addressStore: solAddressDevnetStore,
		getAddress: getSolAddressDevnet
	},
	local: {
		addressStore: solAddressLocalnetStore,
		getAddress: getSolAddressLocal
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
