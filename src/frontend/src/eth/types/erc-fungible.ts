import type { Erc20Token } from '$eth/types/erc20';
import type { Erc4626Token } from '$eth/types/erc4626';

export type ErcFungibleToken = Erc20Token | Erc4626Token;
