import { CKERC20_FEE } from '$eth/constants/ckerc20.constants';
import { CKETH_FEE } from '$eth/constants/cketh.constants';
import { ERC20_FALLBACK_FEE } from '$eth/constants/erc20.constants';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import { infuraErc20IcpProviders } from '$eth/providers/infura-erc20-icp.providers';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { isDestinationContractAddress } from '$eth/utils/send.utils';
import type { EthAddress, OptionEthAddress } from '$lib/types/address';
import type { Network, NetworkId } from '$lib/types/network';
import { isNetworkIdICP } from '$lib/utils/network.utils';

export interface GetFeeData {
	from: EthAddress;
	to: EthAddress;
	value?: bigint;
	data?: string;
}

export const getEthFeeData = ({
	to,
	helperContractAddress
}: GetFeeData & {
	helperContractAddress: OptionEthAddress;
}): bigint => {
	if (isDestinationContractAddress({ destination: to, contractAddress: helperContractAddress })) {
		return CKETH_FEE;
	}

	return ETH_BASE_FEE;
};

export const getErc20FeeData = async ({
	targetNetwork,
	sourceNetwork: { id: sourceNetworkId },
	contract,
	amount,
	...rest
}: GetFeeData & {
	contract: Erc20Token;
	amount: bigint;
	sourceNetwork: EthereumNetwork;
	targetNetwork: Network | undefined;
}): Promise<bigint> => {
	try {
		const targetNetworkId: NetworkId | undefined = targetNetwork?.id;

		const { getFeeData } = isNetworkIdICP(targetNetworkId)
			? infuraErc20IcpProviders(targetNetworkId as NetworkId)
			: infuraErc20Providers(targetNetworkId ?? sourceNetworkId);
		const fee = await getFeeData({ ...rest, contract, amount });

		const isResearchCoin = contract.symbol === 'RSC' && contract.name === 'ResearchCoin';

		// The cross-chain team recommended adding 10% to the fee to provide some buffer for when the transaction is effectively executed.
		// However, according to our observations, we noticed that ERC20 transactions require even more fees. That is why we actually add 50%.
		// Note that originally we added 25% but, after facing some issues with transferring Pepe on busy network, we decided to enhance the allowance further.
		// Additionally, for some particular tokens (RSC), the returned estimated by infura fee is too low. Short-term solution: increase the fee manually for RSC by 150%.
		// TODO: discuss the fee estimation issue with the cross-chain team and decide how can we properly calculate the max gas
		const feeBuffer = isResearchCoin ? (fee * 15n) / 10n : fee / 2n;

		return fee + feeBuffer;
	} catch (err: unknown) {
		// We silence the error on purpose.
		// The queries above often produce errors on mainnet, even when all parameters are correctly set.
		// Additionally, it's possible that the queries are executed with inaccurate parameters, such as when a user enters an incorrect address or an address that is not supported by the selected function (e.g., an ICP account identifier on the Ethereum network rather than for the burn contract).
		console.warn(err);

		return ERC20_FALLBACK_FEE;
	}
};

export const getCkErc20FeeData = async ({
	erc20HelperContractAddress,
	to,
	...rest
}: GetFeeData & {
	contract: Erc20Token;
	amount: bigint;
	sourceNetwork: EthereumNetwork;
	erc20HelperContractAddress: OptionEthAddress;
}): Promise<bigint> => {
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
		return estimateGasForApprove + CKERC20_FEE;
	}

	return estimateGasForApprove;
};
