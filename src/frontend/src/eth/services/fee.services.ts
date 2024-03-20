import { CKETH_FEE } from '$eth/constants/cketh.constants';
import { ERC20_FALLBACK_FEE } from '$eth/constants/erc20.constants';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraErc20IcpProviders } from '$eth/providers/infura-erc20-icp.providers';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { isCkEthHelperContract } from '$eth/utils/send.utils';
import type { CkEthHelperContractAddressData } from '$icp-eth/stores/cketh.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { Network } from '$lib/types/network';
import { isNetworkICP } from '$lib/utils/network.utils';
import { nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export interface GetFeeData {
	address: ETH_ADDRESS;
}

export const getEthFeeData = async ({
	address,
	helperContractAddress
}: GetFeeData & {
	helperContractAddress: CkEthHelperContractAddressData | null | undefined;
}): Promise<BigNumber> => {
	if (isCkEthHelperContract({ destination: address, helperContractAddress })) {
		return BigNumber.from(CKETH_FEE);
	}

	return BigNumber.from(ETH_BASE_FEE);
};

export const getErc20FeeData = async ({
	targetNetwork,
	sourceNetwork: { id: sourceNetworkId },
	...rest
}: GetFeeData & {
	contract: Erc20ContractAddress;
	amount: BigNumber;
	sourceNetwork: EthereumNetwork;
	targetNetwork: Network | undefined;
}): Promise<BigNumber> => {
	try {
		const { getFeeData: fn } =
			nonNullish(targetNetwork) && isNetworkICP(targetNetwork)
				? infuraErc20IcpProviders(targetNetwork.id)
				: infuraErc20Providers(targetNetwork?.id ?? sourceNetworkId);
		return await fn(rest);
	} catch (err: unknown) {
		// We silence the error on purpose.
		// The queries above often produce errors on mainnet, even when all parameters are correctly set.
		// Additionally, it's possible that the queries are executed with inaccurate parameters, such as when a user enters an incorrect address or an address that is not supported by the selected function (e.g., an ICP account identifier on the Ethereum network rather than for the burn contract).
		console.error(err);

		return BigNumber.from(ERC20_FALLBACK_FEE);
	}
};
