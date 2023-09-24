import { ERC20_FALLBACK_FEE } from '$lib/constants/erc20.constants';
import { TargetNetwork } from '$lib/enums/network';
import { getFeeData } from '$lib/providers/infura-erc20.providers';
import { getFeeData as getBurnFeeData } from '$lib/providers/infura-icp-erc20.providers';
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
		if (err instanceof Object && 'code' in err && err.code === 'UNPREDICTABLE_GAS_LIMIT') {
			return BigNumber.from(ERC20_FALLBACK_FEE);
		}

		throw err;
	}
};
