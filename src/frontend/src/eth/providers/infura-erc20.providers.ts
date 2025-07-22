import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { ERC20_ABI } from '$eth/constants/erc20.constants';
import type { Erc20Provider } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress, Erc20Metadata } from '$eth/types/erc20';
import { ZERO } from '$lib/constants/app.constants';
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

	getFeeData = async ({
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

		const results = await Promise.allSettled([
			erc20Contract.approve.estimateGas(to, amount, { from }),
			erc20Contract.transfer.estimateGas(to, amount, { from })
		]);

		return results.reduce((max, result) => {
			if (result.status === 'fulfilled' && result.value > max) {
				return result.value;
			}
			return max;
		}, ZERO);
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

	// We use this function to differentiate between Erc20 and Erc721 contracts, because currently we do
	// not have another way to find out the token standard only by contract address.
	isErc20 = async ({ contractAddress }: { contractAddress: string }): Promise<boolean> => {
		const erc20Contract = new Contract(contractAddress, ERC20_ABI, this.provider);

		try {
			await erc20Contract.decimals();
			return true;
		} catch (_: unknown) {
			return false;
		}
	};
}

const providers: Record<NetworkId, InfuraErc20Provider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, InfuraErc20Provider>>(
	(acc, { id, providers: { infura } }) => ({ ...acc, [id]: new InfuraErc20Provider(infura) }),
	{}
);

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
