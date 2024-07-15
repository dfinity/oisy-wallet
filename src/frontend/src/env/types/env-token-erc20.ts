import type { RequiredErc20Token } from '$eth/types/erc20';

export type EnvTokenErc20 = Omit<RequiredErc20Token, 'address'>;
