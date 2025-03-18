import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';

export const certified = true;

// TODO: remove these, unnecessary anymore since they are all bigint
export const bn1 = 1n;
export const bn2 = 2n;
export const bn3 = 3n;

export const mockBalances: CertifiedStoreData<BalancesData> = {
	[ICP_TOKEN.id]: { data: bn1, certified },
	[BTC_MAINNET_TOKEN.id]: { data: bn2, certified },
	[ETHEREUM_TOKEN.id]: { data: bn3, certified }
};
