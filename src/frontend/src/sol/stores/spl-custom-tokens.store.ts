import { initCertifiedUserTokensStore } from '$lib/stores/user-tokens.store';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';
import type { PrincipalText } from '@dfinity/zod-schemas';

export const SPL_CUSTOM_TOKENS_KEY = 'spl-custom-tokens';

export type SplAddressMap = Record<PrincipalText, SplTokenAddress[]>;

export const splCustomTokensStore = initCertifiedUserTokensStore<SplToken>();
