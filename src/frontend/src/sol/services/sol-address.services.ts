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
import { getAddressDecoder, getAddressEncoder } from '@solana/kit';

const getSolanaPublicKey = async ({
	derivationPath,
	...rest
}: CanisterApiFunctionParams<{ derivationPath: string[] }>): Promise<Uint8Array | number[]> =>
	await getSchnorrPublicKey({
		...rest,
		keyId: SOLANA_KEY_ID,
		derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, ...derivationPath]
	});

const getSolAddress = async ({
	identity,
	derivationPath,
	network
}: {
	identity: OptionIdentity;
	derivationPath: string[];
	network: SolanaNetworkType;
}): Promise<SolAddress> => {
	const foo = await deriveSolAddress(
		'xlmxo-5n3p7-s56nq-7wlbe-nrvij-7veys-thk7y-uuxol-wjzki-rbcqi-aqe',
		network
	);
	const encoder = new TextEncoder();
	const uint8Array = encoder.encode(foo);
	const base58StringBytes = Uint8Array.from([...foo].map((c) => c.charCodeAt(0)));

	const decoder2 = getAddressDecoder();
	const decoder3 = getAddressEncoder();
	// const av = decoder3.encode(address(foo));
	// const bar = decoder2.decode(Uint8Array.from(uint8Array));
	const bar = decoder2.decode(base58StringBytes);

	// 2EQneZBEeL3XGy3YaQAgxwxYvKq2bRPfQVpiGXgpQEfv - mainnet
	// 3azSdZ7u1LxpxTVE6T4oH9XuTYidD7fNhXmJKhTTczw4 -- devnet

	const publicKey = await getSolanaPublicKey({ identity, derivationPath });

	console.log(`SolAddress for ${network}: ${foo}`, publicKey, base58StringBytes, uint8Array, bar);

	const decoder = getAddressDecoder();
	return decoder.decode(Uint8Array.from(publicKey));
};

export const getSolAddressMainnet = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({
		identity,
		derivationPath: [SolanaNetworks.mainnet],
		network: SolanaNetworks.mainnet
	});

export const getSolAddressDevnet = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({
		identity,
		derivationPath: [SolanaNetworks.devnet],
		network: SolanaNetworks.devnet
	});

export const getSolAddressLocal = async (identity: OptionIdentity): Promise<SolAddress> =>
	await getSolAddress({
		identity,
		derivationPath: [SolanaNetworks.local],
		network: SolanaNetworks.local
	});

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
