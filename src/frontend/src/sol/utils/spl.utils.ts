import { toggleableTokenGuard, tokenStandardGuard } from '$lib/utils/token-guards.utils';
import type { SplToken } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';

export const isTokenSpl = tokenStandardGuard<SplToken>('spl');

export const isTokenSplCustomToken = toggleableTokenGuard<SplCustomToken>(isTokenSpl);
