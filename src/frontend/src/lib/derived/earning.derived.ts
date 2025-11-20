import { goto } from '$app/navigation';
import { EarningCardFields } from '$env/types/env.earning-cards';
import { isGLDTToken } from '$icp-eth/utils/token.utils';
import { gldtStakeStore } from '$icp/stores/gldt-stake.store';
import { ZERO } from '$lib/constants/app.constants';
import { AppPath } from '$lib/constants/routes.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import {
	enabledFungibleTokensUi,
	enabledMainnetFungibleTokensUsdBalance
} from '$lib/derived/tokens.derived';
import { i18n } from '$lib/stores/i18n.store';
import { formatStakeApyNumber, formatToken } from '$lib/utils/format.utils';
import { calculateTokenUsdAmount } from '$lib/utils/token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

type EarningDataRecord = { [key in EarningCardFields]?: string | number } & {
	action: () => Promise<void>;
};

type EarningData = Record<string, EarningDataRecord>;

export const earningData: Readable<EarningData> = derived(
	[
		i18n,
		exchanges,
		enabledFungibleTokensUi,
		enabledMainnetFungibleTokensUsdBalance,
		gldtStakeStore
	],
	([
		$i18n,
		$exchanges,
		$enabledFungibleTokensUi,
		$enabledMainnetFungibleTokensUsdBalance,
		$gldtStakeStore
	]) => {
		const gldtToken = $enabledFungibleTokensUi.find(isGLDTToken);
		return {
			'gldt-staking': {
				[EarningCardFields.APY]: nonNullish($gldtStakeStore?.apy)
					? formatStakeApyNumber($gldtStakeStore.apy)
					: undefined,
				[EarningCardFields.CURRENT_STAKED]: nonNullish(gldtToken)
					? `${formatToken({
							value: $gldtStakeStore?.position?.staked ?? ZERO,
							unitName: gldtToken.decimals
						})} ${gldtToken.symbol}`
					: undefined,
				[EarningCardFields.EARNING_POTENTIAL]: nonNullish($gldtStakeStore?.apy)
					? ($enabledMainnetFungibleTokensUsdBalance * $gldtStakeStore.apy) / 100
					: undefined,
				[EarningCardFields.CURRENT_EARNING]: nonNullish(gldtToken)
					? calculateTokenUsdAmount({
							amount: $gldtStakeStore?.position?.staked,
							token: gldtToken,
							$exchanges
						})
					: undefined,
				[EarningCardFields.TERMS]: $i18n.earning.terms.flexible,
				action: () => goto(AppPath.EarningGold)
			}
		};
	}
);

export const highestApyEarningData: Readable<EarningDataRecord | undefined> = derived(
	[earningData],
	([$earningData]) => {
		const entries = Object.values($earningData);

		if (entries.length === 0) {
			return;
		}

		return entries.reduce<EarningDataRecord | undefined>((highest, record) => {
			const apyRaw = record[EarningCardFields.APY];
			const currentApy = Number(apyRaw);

			if (!Number.isFinite(currentApy)) {
				return highest;
			}

			if (isNullish(highest)) {
				return record;
			}

			const highestApy = Number(highest[EarningCardFields.APY]);

			return currentApy > highestApy ? record : highest;
		}, undefined);
	}
);
