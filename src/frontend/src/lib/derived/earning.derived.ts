import { EarningCardFields } from '$env/types/env.earning-cards';
import { earningProviders } from '$lib/providers/earning.providers';
import type { EarningData, EarningProviderData } from '$lib/types/earning-provider';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const earningData: Readable<EarningData> = derived(
	earningProviders.map((p) => p.data),
	(dataValues) =>
		Object.fromEntries(earningProviders.map((provider, i) => [provider.id, dataValues[i]]))
);

export const highestApyEarningData: Readable<EarningProviderData | undefined> = derived(
	[earningData],
	([$earningData]) => {
		const entries = Object.values($earningData);

		if (entries.length === 0) {
			return;
		}

		return entries.reduce<EarningProviderData | undefined>((highest, record) => {
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

export const highestApyEarning: Readable<number> = derived(
	[highestApyEarningData],
	([$highestApyEarningData]) =>
		!isNaN(Number($highestApyEarningData?.[EarningCardFields.APY]))
			? Number($highestApyEarningData?.[EarningCardFields.APY])
			: 0
);

export const highestEarningPotentialUsd: Readable<number> = derived(
	[earningData],
	([$earningData]) =>
		Object.values($earningData).reduce<number>((acc, record) => {
			const potential = Number(record[EarningCardFields.EARNING_POTENTIAL]);
			return !isNaN(potential) ? Math.max(acc, potential) : acc;
		}, 0)
);

export const allEarningPositionsUsd: Readable<number> = derived([earningData], ([$earningData]) =>
	Object.values($earningData).reduce<number>(
		(acc, record) =>
			isNaN(Number(record[EarningCardFields.CURRENT_STAKED]))
				? acc
				: acc + Number(record[EarningCardFields.CURRENT_STAKED]),
		0
	)
);

export const allEarningYearlyAmountUsd = derived([earningData], ([$earningData]) =>
	Object.values($earningData).reduce<number>(
		(acc, record) =>
			isNaN(Number(record[EarningCardFields.CURRENT_EARNING]))
				? acc
				: acc + Number(record[EarningCardFields.CURRENT_EARNING]),
		0
	)
);
