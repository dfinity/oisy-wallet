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

		if (entries.length === 0) return undefined;

		return entries.reduce<EarningDataRecord | undefined>((highest, record) => {
			const apy = Number(record[EarningCardFields.APY] ?? 0);

			if (isNullish(apy) || isNaN(apy)) return highest;

			if (isNullish(highest)) return record;

			const highestApy = Number(highest[EarningCardFields.APY] ?? 0);

			return apy > highestApy ? record : highest;
		}, undefined);
	}
);

export const allEarningPositionsUsd = derived([earningData], ([$earningData]) =>
	Object.values($earningData).reduce<number>((acc, record) => {
		const currentEarning = Number(record[EarningCardFields.CURRENT_EARNING] ?? 0);
		return isNaN(currentEarning) ? acc : acc + currentEarning;
	}, 0)
);

export const allEarningYearlyAmountUsd = derived([earningData], ([$earningData]) =>
	Object.values($earningData).reduce((acc, record) => {
		const earning = Number(record[EarningCardFields.CURRENT_EARNING] ?? 0);
		const apy = Number(record[EarningCardFields.APY] ?? 0);

		// Skip invalid values
		if (Number.isNaN(earning) || Number.isNaN(apy)) return acc;

		return acc + earning * (apy / 100);
	}, 0)
);
