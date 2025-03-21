import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { BigNumber } from 'alchemy-sdk';

export const certified = true;

export const bn1Bi = 1n;
export const bn2Bi = 2n;
export const bn3Bi = 3n;

export const bn1 = BigNumber.from(bn1Bi);
export const bn2 = BigNumber.from(bn2Bi);
export const bn3 = BigNumber.from(bn3Bi);

export const mockBalances: CertifiedStoreData<BalancesData> = {
	[ICP_TOKEN.id]: { data: bn1Bi, certified },
	[BTC_MAINNET_TOKEN.id]: { data: bn2Bi, certified },
	[ETHEREUM_TOKEN.id]: { data: bn3Bi, certified }
};
