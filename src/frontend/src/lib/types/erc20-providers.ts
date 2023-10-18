import type { ETH_ADDRESS } from '$lib/types/address';
import type { Erc20ContractAddress } from '$lib/types/erc20';
import type { BigNumber } from '@ethersproject/bignumber';
import type { PopulatedTransaction } from '@ethersproject/contracts';

export type Erc20PopulateTransaction = (params: {
	contract: Erc20ContractAddress;
	to: ETH_ADDRESS;
	amount: BigNumber;
}) => Promise<PopulatedTransaction>;
