import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { WebSocketListener } from '$lib/types/listener';
import type { NetworkId } from '$lib/types/network';
import type { TransactionResponseWithBigInt } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import {
	Alchemy,
	AlchemySubscription,
	type AlchemyEventType,
	type AlchemySettings,
	type Network
} from 'alchemy-sdk';
import type { Listener } from 'ethers/utils';
import { get } from 'svelte/store';
import type { NftId } from '$lib/types/nft';
import { parseNftId } from '$lib/validation/nft.validation';
import type { Erc721ContractAddress } from '$eth/types/erc721';
import type { Erc1155ContractAddress } from '$eth/types/erc1155';
import type { AlchemyProviderOwnedNfts } from '$eth/types/alchemy-nfts';

type AlchemyConfig = Pick<AlchemySettings, 'apiKey' | 'network'>;

const configs: Record<NetworkId, AlchemyConfig> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, AlchemyConfig>>(
	(acc, { id, providers: { alchemy } }) => ({
		...acc,
		[id]: {
			apiKey: ALCHEMY_API_KEY,
			network: alchemy
		}
	}),
	{}
);

const alchemyConfig = (networkId: NetworkId): AlchemyConfig => {
	const provider = configs[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_alchemy_config, {
			$network: networkId.toString()
		})
	);

	return provider;
};

export const initMinedTransactionsListener = ({
	listener,
	networkId,
	toAddress
}: {
	listener: Listener;
	networkId: NetworkId;
	toAddress?: EthAddress;
}): WebSocketListener => {
	let provider: Alchemy | null = new Alchemy(alchemyConfig(networkId));

	const event: AlchemyEventType = {
		method: AlchemySubscription.MINED_TRANSACTIONS,
		hashesOnly: true,
		addresses: nonNullish(toAddress) ? [{ to: toAddress }] : undefined
	};

	provider.ws.on(event, listener);

	return {
		// eslint-disable-next-line require-await
		disconnect: async () => {
			// Alchemy is buggy. Despite successfully removing all listeners, attaching new similar events would have the effect of doubling the triggers. That's why we reset it to null.
			provider?.ws.off(event);
			provider?.ws.removeAllListeners();
			provider = null;
		}
	};
};

export const initPendingTransactionsListener = ({
	toAddress,
	listener,
	networkId,
	hashesOnly = false
}: {
	toAddress: EthAddress;
	listener: Listener;
	networkId: NetworkId;
	hashesOnly?: boolean;
}): WebSocketListener => {
	let provider: Alchemy | null = new Alchemy(alchemyConfig(networkId));

	const event: AlchemyEventType = {
		method: AlchemySubscription.PENDING_TRANSACTIONS,
		toAddress,
		hashesOnly
	};

	provider.ws.on(event, listener);

	return {
		// eslint-disable-next-line require-await
		disconnect: async () => {
			// Alchemy is buggy. Despite successfully removing all listeners, attaching new similar events would have the effect of doubling the triggers. That's why we reset it to null.
			provider?.ws.off(event);
			provider?.ws.removeAllListeners();
			provider = null;
		}
	};
};

export class AlchemyProvider {
	private readonly provider: Alchemy;

	constructor(private readonly network: Network) {
		this.provider = new Alchemy({
			apiKey: ALCHEMY_API_KEY,
			network: this.network
		});
	}

	getTransaction = async (hash: string): Promise<TransactionResponseWithBigInt | null> => {
		const transaction = await this.provider.core.getTransaction(hash);

		if (isNullish(transaction)) {
			return transaction;
		}

		const { value, gasLimit, gasPrice, chainId, ...rest } = transaction;

		return {
			...rest,
			value: value.toBigInt(),
			gasLimit: gasLimit.toBigInt(),
			gasPrice: gasPrice?.toBigInt(),
			chainId: BigInt(chainId)
		};
	};

	getNftIdsForOwner = async ({
		 address,
		 contractAddress
	 }: {
		address: EthAddress;
		contractAddress: Erc721ContractAddress['address'] | Erc1155ContractAddress['address'];
	}): Promise<NftId[]> => {
		const result: AlchemyProviderOwnedNfts = await this.provider.nft.getNftsForOwner(address, {
			contractAddresses: [contractAddress],
			omitMetadata: true
		});

		return result.ownedNfts.map((nft) => parseNftId(parseInt(nft.tokenId)));
	};
}

const providers: Record<NetworkId, AlchemyProvider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, AlchemyProvider>>(
	(acc, { id, providers: { alchemy } }) => ({ ...acc, [id]: new AlchemyProvider(alchemy) }),
	{}
);

export const alchemyProviders = (networkId: NetworkId): AlchemyProvider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_alchemy_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
