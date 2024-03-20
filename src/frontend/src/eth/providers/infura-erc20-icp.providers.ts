import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
import { INFURA_NETWORK_HOMESTEAD, INFURA_NETWORK_SEPOLIA } from '$env/networks.eth.env';
import { ERC20_ICP_ABI } from '$eth/constants/erc20-icp.constants';
import type { Erc20Provider, PopulateTransactionParams } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { assertNonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import type { PopulatedTransaction } from '@ethersproject/contracts';
import type { Networkish } from '@ethersproject/networks';
import { InfuraProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_INFURA_API_KEY;

export class InfuraErc20IcpProvider implements Erc20Provider {
	private readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, API_KEY);
	}

	getFeeData = ({
		contract: { address: contractAddress },
		address,
		amount
	}: {
		contract: Erc20ContractAddress;
		address: ETH_ADDRESS;
		amount: BigNumber;
	}): Promise<BigNumber> => {
		const erc20Contract = new ethers.Contract(contractAddress, ERC20_ICP_ABI, this.provider);
		return erc20Contract.estimateGas.burnToAccountId(amount, address);
	};

	/**
	 * @override
	 */
	populateTransaction = ({
		contract: { address: contractAddress },
		to,
		amount
	}: PopulateTransactionParams & { amount: BigNumber }): Promise<PopulatedTransaction> => {
		const erc20Contract = new ethers.Contract(contractAddress, ERC20_ICP_ABI, this.provider);
		return erc20Contract.populateTransaction.burnToAccountId(amount, to);
	};
}

const providers: Record<NetworkId, InfuraErc20IcpProvider> = {
	[ETHEREUM_NETWORK_ID]: new InfuraErc20IcpProvider(INFURA_NETWORK_HOMESTEAD),
	[SEPOLIA_NETWORK_ID]: new InfuraErc20IcpProvider(INFURA_NETWORK_SEPOLIA)
};

export const infuraErc20IcpProviders = (networkId: NetworkId): InfuraErc20IcpProvider => {
	const provider = providers[networkId];

	assertNonNullish(provider, `No Infura ERC20 Icp provider for network ${networkId.toString()}`);

	return provider;
};
