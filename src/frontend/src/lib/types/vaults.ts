import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import type { TokenUi } from '$lib/types/token-ui';

export interface Vault {
	token: TokenUi<Erc4626CustomToken>;
	apy?: string;
	totalValueLocked?: string;
}
