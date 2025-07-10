import type { TokenLinkedData } from '$lib/types/token';
import type { RequiredErc721Token } from '$eth/types/erc721';

export type RequiredEvmErc721Token = Omit<RequiredErc721Token, keyof TokenLinkedData>;