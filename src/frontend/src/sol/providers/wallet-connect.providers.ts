import { CAIP10_CHAINS_KEYS } from '$env/caip10-chains.env';
import { WALLET_CONNECT_METADATA } from '$eth/constants/wallet-connect.constants';
import {
	BaseWalletConnectProvider,
	type WalletConnectMetadata,
	type WalletConnectNamespace
} from '$lib/providers/wallet-connect';
import type { SolAddress } from '$lib/types/address';
import type { WalletConnectListener } from '$lib/types/wallet-connect';

export class SolanaWalletConnectProvider extends BaseWalletConnectProvider {
	private readonly address: SolAddress;

	private constructor(address: SolAddress) {
		super();
		this.address = address;
	}

	static async create({
		uri,
		address
	}: {
		uri: string;
		address: SolAddress;
	}): Promise<WalletConnectListener> {
		const provider = new SolanaWalletConnectProvider(address);
		await provider.init(WALLET_CONNECT_METADATA as WalletConnectMetadata);
		return provider.createListener(uri);
	}

	protected buildNamespaces(): Record<string, WalletConnectNamespace> {
		return {
			solana: {
				chains: CAIP10_CHAINS_KEYS,
				methods: ['solana_signTransaction', 'solana_signMessage'],
				events: ['accountsChanged', 'chainChanged'],
				accounts: CAIP10_CHAINS_KEYS.map((chain) => `${chain}:${this.address}`)
			}
		};
	}
}

export const initSolWalletConnect = async ({
	uri,
	address
}: {
	uri: string;
	address: SolAddress;
}): Promise<WalletConnectListener> => await SolanaWalletConnectProvider.create({ uri, address });
