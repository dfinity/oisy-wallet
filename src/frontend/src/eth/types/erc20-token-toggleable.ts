import type { Erc20Token } from '$eth/types/erc20';
import type { TokenToggleable } from '$lib/types/token-toggleable';

export type Erc20TokenToggleable = TokenToggleable<Erc20Token>;
