import { ERC20_FALLBACK_FEE } from '$lib/constants/erc20.constants';
import { TargetNetwork } from '$lib/enums/network';
import { getFeeData as getBurnFeeData } from '$lib/providers/infura-erc20-icp.providers';
import { getFeeData } from '$lib/providers/infura-erc20.providers';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { Erc20ContractAddress } from '$lib/types/erc20';
import { BigNumber } from '@ethersproject/bignumber';

export const getErc20FeeData = async ({
	network,
	...rest
}: {
	contract: Erc20ContractAddress;
	address: ETH_ADDRESS;
	amount: BigNumber;
	network: TargetNetwork | undefined;
}): Promise<BigNumber> => {
	try {
		const fn = network === TargetNetwork.ICP ? getBurnFeeData : getFeeData;
		return await fn(rest);
	} catch (err: unknown) {
		// We silence the error on purpose.
		// The queries above often produce errors on mainnet, even when all parameters are correctly set.
		// Additionally, it's possible that the queries are executed with inaccurate parameters, such as when a user enters an incorrect address or an address that is not supported by the selected function (e.g., an ICP account identifier on the Ethereum network rather than for the burn contract).
		console.error(err);

		return BigNumber.from(ERC20_FALLBACK_FEE);
	}
};
