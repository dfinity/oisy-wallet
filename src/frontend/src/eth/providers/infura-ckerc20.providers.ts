import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
import { INFURA_NETWORK_HOMESTEAD, INFURA_NETWORK_SEPOLIA } from '$env/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { CKERC20_ABI } from '$eth/constants/ckerc20.constants';
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

export class InfuraCkErc20Provider {
	private readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, INFURA_API_KEY);
	}

	getFeeData = ({
		contract: { address: contractAddress },
		erc20Contract: { address: erc20ContractAddress },
		to,
		amount
	}: {
		contract: Erc20ContractAddress;
		erc20Contract: Erc20ContractAddress;
		to: EthAddress;
		amount: BigNumber;
	}): Promise<BigNumber> => {
		const ckEthContract = new ethers.Contract(contractAddress, CKERC20_ABI, this.provider);
		return ckEthContract.estimateGas.deposit(erc20ContractAddress, amount, to);
	};

	populateTransaction = ({
		contract: { address: contractAddress },
		erc20Contract: { address: erc20ContractAddress },
		to,
		amount
	}: {
		contract: Erc20ContractAddress;
		erc20Contract: Erc20ContractAddress;
		to: EthAddress;
		amount: BigNumber;
	}): Promise<PopulatedTransaction> => {
		const erc20Contract = new ethers.Contract(contractAddress, CKERC20_ABI, this.provider);
		return erc20Contract.populateTransaction.deposit(erc20ContractAddress, amount, to);
	};
}

const providers: Record<NetworkId, InfuraCkErc20Provider> = {
	[ETHEREUM_NETWORK_ID]: new InfuraCkErc20Provider(INFURA_NETWORK_HOMESTEAD),
	[SEPOLIA_NETWORK_ID]: new InfuraCkErc20Provider(INFURA_NETWORK_SEPOLIA)
};

export const infuraCkErc20Providers = (networkId: NetworkId): InfuraCkErc20Provider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_cketh_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
