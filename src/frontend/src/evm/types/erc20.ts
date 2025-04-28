import type { RequiredErc20Token } from '$eth/types/erc20';
import type { TokenLinkedData } from '$lib/types/token';

export type RequiredEvmErc20Token = Omit<RequiredErc20Token, keyof TokenLinkedData>;
