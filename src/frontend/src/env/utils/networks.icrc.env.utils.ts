import { CKETH_EXPLORER_URL, CKETH_SEPOLIA_EXPLORER_URL } from '$env/explorers.env';
import type { EnvTokens, EnvTokenSymbol } from '$env/types/env-token-ckerc20';
import type { IcCkInterface } from '$icp/types/ic';
import { PROD, STAGING } from '$lib/constants/app.constants';
import type { NetworkEnvironment } from '$lib/types/network';
import { nonNullish } from '@dfinity/utils';

export const mapCkErc20Data = ({
	ckErc20Tokens,
	minterCanisterId,
	ledgerCanisterId,
	env
}: {
	ckErc20Tokens: EnvTokens;
	minterCanisterId: string | null | undefined;
	ledgerCanisterId: string | null | undefined;
	env: NetworkEnvironment;
}): Record<EnvTokenSymbol, Omit<IcCkInterface, 'twinToken' | 'position'>> =>
	Object.entries(ckErc20Tokens).reduce(
		(acc, [key, value]) => ({
			...acc,
			...((STAGING || PROD) &&
				nonNullish(value) &&
				nonNullish(minterCanisterId) && {
					[key]: {
						...value,
						minterCanisterId,
						exchangeCoinId: 'ethereum',
						explorerUrl: `${env === 'testnet' ? CKETH_SEPOLIA_EXPLORER_URL : CKETH_EXPLORER_URL}/${value.ledgerCanisterId}`,
						...(nonNullish(ledgerCanisterId) && {
							feeLedgerCanisterId: ledgerCanisterId
						})
					}
				})
		}),
		{}
	);
