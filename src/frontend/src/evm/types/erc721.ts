import type { RequiredErc721Token } from '$eth/types/erc721';
import type { TokenLinkedData } from '$lib/types/token';

export type RequiredEvmErc721Token = Omit<RequiredErc721Token, keyof TokenLinkedData>;
