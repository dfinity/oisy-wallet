import type { ContractAddress } from '$eth/types/address';
import type { Exchange } from '$lib/types/exchange';
import type { Token } from '$lib/types/token';

export type SplToken = SplContract & Token;

export type SplContractAddress = ContractAddress;
export type SplContract = SplContractAddress & { exchange: Exchange };
