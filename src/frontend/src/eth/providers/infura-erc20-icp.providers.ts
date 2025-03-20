import {
	ETHEREUM_NETWORK_ID,
	INFURA_NETWORK_HOMESTEAD,
	INFURA_NETWORK_SEPOLIA,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { ERC20_ICP_ABI } from '$eth/constants/erc20-icp.constants';
import type { Erc20Provider, PopulateTransactionParams } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import type { PopulatedTransaction } from '@ethersproject/contracts';
import type { Networkish } from '@ethersproject/networks';
import { InfuraProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { get } from 'svelte/store';

export class InfuraErc20IcpProvider implements Erc20Provider {
	private readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, INFURA_API_KEY);
	}

	getFeeData = ({
		contract: { address: contractAddress },
		from,
		to,
		amount
	}: {
		contract: Erc20ContractAddress;
		to: EthAddress;
		from: EthAddress;
		amount: BigNumber;
	}): Promise<BigNumber> => {
		const erc20Contract = new ethers.Contract(contractAddress, ERC20_ICP_ABI, this.provider);
		return erc20Contract.estimateGas.burnToAccountId(amount, to, { from });
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

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_erc20_icp_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
