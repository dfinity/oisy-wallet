import type { Erc4626Token } from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { toggleableTokenGuard, tokenStandardGuard } from '$lib/utils/token-guards.utils';

export const isTokenErc4626 = tokenStandardGuard<Erc4626Token>('erc4626');

export const isTokenErc4626CustomToken = toggleableTokenGuard<Erc4626CustomToken>(isTokenErc4626);
