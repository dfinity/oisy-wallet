import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { BigNumber } from '@ethersproject/bignumber';
import type { PopulatedTransaction } from '@ethersproject/contracts';

export interface PopulateTransactionParams {
	contract: Erc20ContractAddress;
	to: ETH_ADDRESS;
}

export type CkEthPopulateTransaction = (
	params: PopulateTransactionParams
) => Promise<PopulatedTransaction>;

export type Erc20PopulateTransaction = (
	params: PopulateTransactionParams & {
		amount: BigNumber;
	}
) => Promise<PopulatedTransaction>;

export interface Erc20Provider {
	populateTransaction: Erc20PopulateTransaction;

	getFeeData(params: {
		contract: Erc20ContractAddress;
		address: ETH_ADDRESS;
		amount: BigNumber;
	}): Promise<BigNumber>;
}
