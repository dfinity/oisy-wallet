import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { NetworkExchange } from '$lib/types/network';

export type Erc20ContractAddressWithNetwork = Erc20ContractAddress & Required<NetworkExchange>;
