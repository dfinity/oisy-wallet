import { EIP155_CHAINS_KEYS } from '$env/eip155-chains.env';
import {
	SESSION_REQUEST_ETH_SEND_TRANSACTION,
	SESSION_REQUEST_ETH_SIGN,
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN,
	WALLET_CONNECT_METADATA
} from '$eth/constants/wallet-connect.constants';
import {
	BaseWalletConnectProvider,
	type WalletConnectMetadata,
	type WalletConnectNamespace
} from '$lib/providers/wallet-connect.base';
import type { EthAddress } from '$lib/types/address';
import type { WalletConnectListener } from '$lib/types/wallet-connect';

export class EthWalletConnectProvider extends BaseWalletConnectProvider {
	private readonly address: EthAddress;

	private constructor(address: EthAddress) {
		super();
		this.address = address;
	}

	static async create({
		address,
		uri
	}: {
		uri: string;
		address: EthAddress;
	}): Promise<WalletConnectListener> {
		const provider = new EthWalletConnectProvider(address);
		await provider.init(WALLET_CONNECT_METADATA as WalletConnectMetadata);
		return provider.createListener(uri);
	}

	protected buildNamespaces(): Record<string, WalletConnectNamespace> {
		return {
			eip155: {
				chains: EIP155_CHAINS_KEYS,
				methods: [
					SESSION_REQUEST_ETH_SEND_TRANSACTION,
					SESSION_REQUEST_ETH_SIGN,
					SESSION_REQUEST_PERSONAL_SIGN,
					SESSION_REQUEST_ETH_SIGN_V4
				],
				events: ['accountsChanged', 'chainChanged'],
				accounts: EIP155_CHAINS_KEYS.map((chain) => `${chain}:${this.address}`)
			}
		};
	}
}

export const initWalletConnect = async ({
	uri,
	address
}: {
	uri: string;
	address: EthAddress;
}): Promise<WalletConnectListener> => await EthWalletConnectProvider.create({ uri, address });
