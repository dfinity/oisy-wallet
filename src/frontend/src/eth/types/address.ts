import type { EthAddressSchema } from '$eth/schema/address.schema';
import type { OptionAddress } from '$lib/types/address';
import type { BaseContract } from 'ethers/contract';
import type * as z from 'zod';

export type EthAddress = z.infer<typeof EthAddressSchema>;

export type OptionEthAddress = OptionAddress<EthAddress>;

export type Erc20ContractAddress = Awaited<ReturnType<BaseContract['getAddress']>>;

export interface ContractAddress {
	address: Erc20ContractAddress;
}
