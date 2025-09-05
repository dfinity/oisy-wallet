import type { Erc721Token } from '$eth/types/erc721';
import type { TokenToggleable } from '$lib/types/token-toggleable';

export type Erc721TokenToggleable = TokenToggleable<Erc721Token>;
