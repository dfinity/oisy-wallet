import { CKERC20_FEE } from '$eth/constants/ckerc20.constants';
import { CKETH_FEE } from '$eth/constants/cketh.constants';
import { ERC20_FALLBACK_FEE } from '$eth/constants/erc20.constants';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraErc20IcpProviders } from '$eth/providers/infura-erc20-icp.providers';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { isDestinationContractAddress } from '$eth/utils/send.utils';
import type { EthAddress, OptionEthAddress } from '$lib/types/address';
import type { Network, NetworkId } from '$lib/types/network';
import { isNetworkIdICP } from '$lib/utils/network.utils';
import { BigNumber } from '@ethersproject/bignumber';

export interface GetFeeData {
	from: EthAddress;
	to: EthAddress;
}

export const getEthFeeData = ({
	to,
	helperContractAddress
}: GetFeeData & {
	helperContractAddress: OptionEthAddress;
}): BigNumber => {
	if (isDestinationContractAddress({ destination: to, contractAddress: helperContractAddress })) {
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
		const targetNetworkId: NetworkId | undefined = targetNetwork?.id;

		const { getFeeData: fn } = isNetworkIdICP(targetNetworkId)
			? infuraErc20IcpProviders(targetNetworkId as NetworkId)
			: infuraErc20Providers(targetNetworkId ?? sourceNetworkId);
		const fee = await fn(rest);

		// The cross-chain team recommended adding 10% to the fee to provide some buffer for when the transaction is effectively executed.
		// However, according to our observations, we noticed that ERC20 transactions require even more fees. That is why we actually add 50%.
		// Note that originally we added 25% but, after facing some issues with transferring Pepe on busy network, we decided to enhance the allowance further.
		const additionalAmount = BigNumber.from(fee.toBigInt() / 2n);

		return fee.add(additionalAmount);
	} catch (err: unknown) {
		// We silence the error on purpose.
		// The queries above often produce errors on mainnet, even when all parameters are correctly set.
		// Additionally, it's possible that the queries are executed with inaccurate parameters, such as when a user enters an incorrect address or an address that is not supported by the selected function (e.g., an ICP account identifier on the Ethereum network rather than for the burn contract).
		console.warn(err);

		return BigNumber.from(ERC20_FALLBACK_FEE);
	}
};

export const getCkErc20FeeData = async ({
	erc20HelperContractAddress,
	to,
	...rest
}: GetFeeData & {
	contract: Erc20ContractAddress;
	amount: BigNumber;
	sourceNetwork: EthereumNetwork;
	erc20HelperContractAddress: OptionEthAddress;
}): Promise<BigNumber> => {
	const estimateGasForApprove = await getErc20FeeData({
		to,
		targetNetwork: undefined,
		...rest
	});

	const targetCkErc20Helper = isDestinationContractAddress({
		destination: to,
		contractAddress: erc20HelperContractAddress
	});

	if (targetCkErc20Helper) {
		return estimateGasForApprove.add(CKERC20_FEE);
	}

	return estimateGasForApprove;
};
