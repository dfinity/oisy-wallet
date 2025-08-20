import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ETHERSCAN_API_KEY } from '$env/rest/etherscan.env';
import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc721Token } from '$eth/types/erc721';
import type { EtherscanProviderTokenId } from '$eth/types/etherscan-token';
import type {
	EtherscanProviderErc1155TokenTransferTransaction,
	EtherscanProviderErc721TokenTransferTransaction,
	EtherscanProviderInternalTransaction,
	EtherscanProviderTokenTransferTransaction,
	EtherscanProviderTransaction
} from '$eth/types/etherscan-transaction';
import type { EthereumChainId } from '$eth/types/network';
import { i18n } from '$lib/stores/i18n.store';
import type { Address, EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { NftId } from '$lib/types/nft';
import type { Transaction } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { assertNonNullish } from '@dfinity/utils';
import {
	EtherscanProvider as EtherscanProviderLib,
	Network,
	type BlockTag
} from 'ethers/providers';
import { get } from 'svelte/store';

interface TransactionsParams {
	address: EthAddress;
	startBlock?: BlockTag;
	endBlock?: BlockTag;
}

export class EtherscanProvider {
	private readonly provider: EtherscanProviderLib;

	constructor(
		private readonly network: Network,
		private readonly chainId: EthereumChainId
	) {
		this.provider = new EtherscanProviderLib(this.network, ETHERSCAN_API_KEY);
	}

	// There is no `getHistory` in ethers v6
	// Issue report: https://github.com/ethers-io/ethers.js/issues/4303
	// Workaround: https://ethereum.stackexchange.com/questions/147756/read-transaction-history-with-ethers-v6-1-0/150836#150836
	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-normal-transactions-by-address
	private async getHistory({
		address,
		startBlock,
		endBlock
	}: TransactionsParams): Promise<Transaction[]> {
		const params = {
			action: 'txlist',
			address,
			startblock: startBlock ?? 0,
			endblock: endBlock ?? 99999999,
			sort: 'asc'
		};

		const result: EtherscanProviderTransaction[] = await this.provider.fetch('account', params);

		return result.map(
			({
				blockNumber,
				timeStamp,
				hash,
				nonce,
				from,
				to,
				value,
				gas,
				gasPrice
			}: EtherscanProviderTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: parseInt(nonce),
				gasLimit: BigInt(gas),
				gasPrice: BigInt(gasPrice),
				value: BigInt(value),
				chainId: this.chainId
			})
		);
	}

	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-internal-transactions-by-address
	private async getInternalHistory({
		address,
		startBlock,
		endBlock
	}: TransactionsParams): Promise<Transaction[]> {
		const params = {
			action: 'txlistinternal',
			address,
			startblock: startBlock ?? 0,
			endblock: endBlock ?? 99999999,
			sort: 'asc'
		};

		const result: EtherscanProviderInternalTransaction[] = await this.provider.fetch(
			'account',
			params
		);

		return result.map(
			({
				blockNumber,
				timeStamp,
				hash,
				from,
				to,
				value,
				gas
			}: EtherscanProviderInternalTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: 0,
				gasLimit: BigInt(gas),
				value: BigInt(value),
				chainId: this.chainId
			})
		);
	}

	transactions = async (params: TransactionsParams): Promise<Transaction[]> => {
		const results = await Promise.all([this.getHistory(params), this.getInternalHistory(params)]);

		return results.flat();
	};

	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
	erc20Transactions = async ({
		address,
		contract: { address: contractAddress }
	}: {
		address: EthAddress;
		contract: Erc20Token;
	}): Promise<Transaction[]> => {
		const params = {
			action: 'tokentx',
			contractAddress,
			address,
			startblock: 0,
			endblock: 99999999,
			sort: 'desc'
		};

		const result: EtherscanProviderTokenTransferTransaction[] | string = await this.provider.fetch(
			'account',
			params
		);

		if (typeof result === 'string') {
			throw new Error(result);
		}

		return result.map(
			({
				nonce,
				gas,
				gasPrice,
				hash,
				blockNumber,
				timeStamp,
				from,
				to,
				value
			}: EtherscanProviderTokenTransferTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				nonce: parseInt(nonce),
				gasLimit: BigInt(gas),
				gasPrice: BigInt(gasPrice),
				value: BigInt(value),
				chainId: this.chainId
			})
		);
	};

	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-erc721-token-transfer-events-by-address
	erc721Transactions = async ({
		address,
		contract: { address: contractAddress }
	}: {
		address: EthAddress;
		contract: Erc721Token;
	}): Promise<Transaction[]> => {
		const params = {
			action: 'tokennfttx',
			contractAddress,
			address,
			startblock: 0,
			endblock: 99999999,
			sort: 'desc'
		};

		const result: EtherscanProviderErc721TokenTransferTransaction[] | string =
			await this.provider.fetch('account', params);

		if (typeof result === 'string') {
			throw new Error(result);
		}

		return result.map(
			({
				nonce,
				gas,
				gasPrice,
				hash,
				blockNumber,
				timeStamp,
				from,
				to,
				tokenID
			}: EtherscanProviderErc721TokenTransferTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				value: BigInt(1),
				tokenId: parseInt(tokenID),
				nonce: parseInt(nonce),
				gasLimit: BigInt(gas),
				gasPrice: BigInt(gasPrice),
				chainId: this.chainId
			})
		);
	};

	// Docs: https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-erc1155-token-transfer-events-by-address
	erc1155Transactions = async ({
		address,
		contract: { address: contractAddress }
	}: {
		address: EthAddress;
		contract: Erc1155Token;
	}): Promise<Transaction[]> => {
		const params = {
			action: 'token1155tx',
			contractAddress,
			address,
			startblock: 0,
			endblock: 99999999,
			sort: 'desc'
		};

		const result: EtherscanProviderErc1155TokenTransferTransaction[] | string =
			await this.provider.fetch('account', params);

		if (typeof result === 'string') {
			throw new Error(result);
		}

		return result.map(
			({
				nonce,
				gas,
				gasPrice,
				hash,
				blockNumber,
				timeStamp,
				from,
				to,
				tokenID,
				tokenValue
			}: EtherscanProviderErc1155TokenTransferTransaction): Transaction => ({
				hash,
				blockNumber: parseInt(blockNumber),
				timestamp: parseInt(timeStamp),
				from,
				to,
				value: BigInt(tokenValue),
				tokenId: parseInt(tokenID),
				nonce: parseInt(nonce),
				gasLimit: BigInt(gas),
				gasPrice: BigInt(gasPrice),
				chainId: this.chainId
			})
		);
	};

	// https://docs.etherscan.io/api-endpoints/tokens#get-address-erc721-token-inventory-by-contract-address
	erc721TokenInventory = async ({
		address,
		contractAddress
	}: {
		address: EthAddress;
		contractAddress: Address;
	}): Promise<NftId[]> => {
		const params = {
			action: 'addresstokennftinventory',
			address,
			contractaddress: contractAddress,
			startblock: 0,
			endblock: 99999999,
			sort: 'desc'
		};

		const result: EtherscanProviderTokenId[] | string = await this.provider.fetch(
			'account',
			params
		);

		if (typeof result === 'string') {
			throw new Error(result);
		}

		return result.map(({ TokenId }: EtherscanProviderTokenId) => parseNftId(parseInt(TokenId)));
	};
}

const providers: Record<NetworkId, EtherscanProvider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, EtherscanProvider>>((acc, { id, name, chainId }) => {
	const network = new Network(name, chainId);

	return { ...acc, [id]: new EtherscanProvider(network, chainId) };
}, {});

export const etherscanProviders = (networkId: NetworkId): EtherscanProvider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_etherscan_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
