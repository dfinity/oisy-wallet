import type { Erc20Token } from '$eth/types/erc20';
import type { UserToken } from '$lib/types/user-token';

export type Erc20CustomToken = UserToken<Erc20Token>;
