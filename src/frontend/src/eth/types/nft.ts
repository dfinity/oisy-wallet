import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc721Token } from '$eth/types/erc721';

export type EthNonFungibleToken = Erc721Token | Erc1155Token;
