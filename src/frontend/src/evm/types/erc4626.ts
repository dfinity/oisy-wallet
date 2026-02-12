import type { RequiredErc4626Token } from '$eth/types/erc4626';
import type { TokenLinkedData } from '$lib/types/token';

export type RequiredEvmErc4626Token = Omit<RequiredErc4626Token, keyof TokenLinkedData>;
