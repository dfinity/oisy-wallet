import { ICP_TOKEN } from '$env/tokens.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { BigNumber } from 'alchemy-sdk';

export const certified = true;

export const bn1 = BigNumber.from(1n);
export const bn2 = BigNumber.from(2n);
export const bn3 = BigNumber.from(3n);

export const mockBalances: CertifiedStoreData<BalancesData> = {
	[ICP_TOKEN.id]: { data: bn1, certified },
	[BTC_MAINNET_TOKEN.id]: { data: bn2, certified },
	[ETHEREUM_TOKEN.id]: { data: bn3, certified }
};
