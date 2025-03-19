import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.env';
import { INFURA_NETWORK_HOMESTEAD, INFURA_NETWORK_SEPOLIA } from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { ERC20_ABI } from '$eth/constants/erc20.constants';
import type { Erc20Provider } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress, Erc20Metadata } from '$eth/types/erc20';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { ethers, type ContractTransaction } from 'ethers';
import { InfuraProvider, type Networkish } from 'ethers/providers';
import { get } from 'svelte/store';

export class InfuraErc20Provider implements Erc20Provider {
	private readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, INFURA_API_KEY);
	}

	metadata = async ({ address }: Pick<Erc20ContractAddress, 'address'>): Promise<Erc20Metadata> => {
		const erc20Contract = new ethers.Contract(address, ERC20_ABI, this.provider);

		const [name, symbol, decimals] = await Promise.all([
			erc20Contract.name(),
			erc20Contract.symbol(),
			erc20Contract.decimals()
		]);

		return {
			name,
			symbol,
			decimals
		};
	};

	balance = ({
		contract: { address: contractAddress },
		address
	}: {
		contract: Erc20ContractAddress;
		address: EthAddress;
	}): Promise<bigint> => {
		const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, this.provider);
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
		const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, this.provider);
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
		const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, this.provider);
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
		const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, this.provider);
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
		const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, this.provider);
		return erc20Contract.allowance(owner, spender);
	};
}

const providers: Record<NetworkId, InfuraErc20Provider> = {
	[ETHEREUM_NETWORK_ID]: new InfuraErc20Provider(INFURA_NETWORK_HOMESTEAD),
	[SEPOLIA_NETWORK_ID]: new InfuraErc20Provider(INFURA_NETWORK_SEPOLIA)
};

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
