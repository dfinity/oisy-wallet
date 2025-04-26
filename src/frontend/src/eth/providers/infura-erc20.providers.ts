import {
	BASE_NETWORK_ID,
	BASE_SEPOLIA_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK_ID,
	BSC_TESTNET_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import {
	ETHEREUM_NETWORK_ID,
	INFURA_NETWORK_BASE,
	INFURA_NETWORK_BASE_SEPOLIA,
	INFURA_NETWORK_BNB_MAINNET,
	INFURA_NETWORK_BNB_TESTNET,
	INFURA_NETWORK_HOMESTEAD,
	INFURA_NETWORK_SEPOLIA,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { ERC20_ABI } from '$eth/constants/erc20.constants';
import type { Erc20Provider } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress, Erc20Metadata } from '$eth/types/erc20';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { Contract, type ContractTransaction } from 'ethers/contract';
import { InfuraProvider, type Networkish } from 'ethers/providers';
import { get } from 'svelte/store';

export class InfuraErc20Provider implements Erc20Provider {
	private readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, INFURA_API_KEY);
	}

	metadata = async ({ address }: Pick<Erc20ContractAddress, 'address'>): Promise<Erc20Metadata> => {
		const erc20Contract = new Contract(address, ERC20_ABI, this.provider);

		const [name, symbol, decimals] = await Promise.all([
			erc20Contract.name(),
			erc20Contract.symbol(),
			erc20Contract.decimals()
		]);

		return {
			name,
			symbol,
			decimals: Number(decimals)
		};
	};

	balance = ({
		contract: { address: contractAddress },
		address
	}: {
		contract: Erc20ContractAddress;
		address: EthAddress;
	}): Promise<bigint> => {
		const erc20Contract = new Contract(contractAddress, ERC20_ABI, this.provider);
		return erc20Contract.balanceOf(address);
	};

	getFeeData = ({
		contract: { address: contractAddress },
		to,
		from,
		amount
	}: {
		contract: Erc20ContractAddress;
		from: EthAddress;
		to: EthAddress;
		amount: bigint;
	}): Promise<bigint> => {
		const erc20Contract = new Contract(contractAddress, ERC20_ABI, this.provider);
		return erc20Contract.approve.estimateGas(to, amount, { from });
	};

	// Transaction send: https://ethereum.stackexchange.com/a/131944

	populateTransaction = ({
		contract: { address: contractAddress },
		to,
		amount
	}: {
		contract: Erc20ContractAddress;
		to: EthAddress;
		amount: bigint;
	}): Promise<ContractTransaction> => {
		const erc20Contract = new Contract(contractAddress, ERC20_ABI, this.provider);
		return erc20Contract.transfer.populateTransaction(to, amount);
	};

	populateApprove = ({
		contract: { address: contractAddress },
		spender,
		amount
	}: {
		contract: Erc20ContractAddress;
		spender: EthAddress;
		amount: bigint;
	}): Promise<ContractTransaction> => {
		const erc20Contract = new Contract(contractAddress, ERC20_ABI, this.provider);
		return erc20Contract.approve.populateTransaction(spender, amount);
	};

	allowance = ({
		contract: { address: contractAddress },
		owner,
		spender
	}: {
		contract: Erc20ContractAddress;
		owner: EthAddress;
		spender: EthAddress;
	}): Promise<bigint> => {
		const erc20Contract = new Contract(contractAddress, ERC20_ABI, this.provider);
		return erc20Contract.allowance(owner, spender);
	};
}

const providersMap: [NetworkId, Networkish][] = [
	[ETHEREUM_NETWORK_ID, INFURA_NETWORK_HOMESTEAD],
	[SEPOLIA_NETWORK_ID, INFURA_NETWORK_SEPOLIA],
	[BASE_NETWORK_ID, INFURA_NETWORK_BASE],
	[BASE_SEPOLIA_NETWORK_ID, INFURA_NETWORK_BASE_SEPOLIA],
	[BSC_MAINNET_NETWORK_ID, INFURA_NETWORK_BNB_MAINNET],
	[BSC_TESTNET_NETWORK_ID, INFURA_NETWORK_BNB_TESTNET]
];

const providers: Record<NetworkId, InfuraErc20Provider> = providersMap.reduce<
	Record<NetworkId, InfuraErc20Provider>
>((acc, [id, name]) => ({ ...acc, [id]: new InfuraErc20Provider(name) }), {});

export const infuraErc20Providers = (networkId: NetworkId): InfuraErc20Provider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_erc20_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
