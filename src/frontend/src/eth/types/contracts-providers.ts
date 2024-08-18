import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { EthAddress } from '$lib/types/address';
import type { BigNumber } from '@ethersproject/bignumber';
import type { PopulatedTransaction } from '@ethersproject/contracts';

export interface PopulateTransactionParams {
	contract: Erc20ContractAddress;
	to: EthAddress;
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
		from: EthAddress;
		to: EthAddress;
		amount: BigNumber;
	}): Promise<BigNumber>;
}
