import { goto } from '$app/navigation';
import { EarningCardFields } from '$env/types/env.earning-cards';
import {
	allHarvestAutopilotTokens,
	enabledHarvestAutopilotsUsdBalance,
	harvestAutopilots,
	harvestAutopilotsCurrentEarning,
	harvestAutopilotsMaxApy,
	harvestAutopilotsUsdBalance
} from '$eth/derived/harvest-autopilots.derived';
import { AppPath } from '$lib/constants/routes.constants';
import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

type EarningDataRecord = { [key in EarningCardFields]?: string | number | string[] } & {
	action: () => Promise<void>;
	disabled?: boolean;
	disabledNotice?: string;
};

type EarningData = Record<string, EarningDataRecord>;

export const earningData: Readable<EarningData> = derived(
	[
		enabledMainnetFungibleTokensUsdBalance,
		harvestAutopilotsUsdBalance,
		enabledHarvestAutopilotsUsdBalance,
		harvestAutopilotsCurrentEarning,
		harvestAutopilots,
		harvestAutopilotsMaxApy,
		allHarvestAutopilotTokens
	],
	([
		$enabledMainnetFungibleTokensUsdBalance,
		$harvestAutopilotsUsdBalance,
		$enabledHarvestAutopilotsUsdBalance,
		$harvestAutopilotsCurrentEarning,
		$harvestAutopilots,
		$harvestAutopilotsMaxApy,
		$allHarvestAutopilotTokens
	]) => ({
		'harvest-autopilot': {
			[EarningCardFields.APY]: $harvestAutopilotsMaxApy,
			[EarningCardFields.CURRENT_EARNING]: $harvestAutopilotsCurrentEarning,
			[EarningCardFields.CURRENT_STAKED]: $harvestAutopilotsUsdBalance,
			[EarningCardFields.NETWORKS]: [
				...$allHarvestAutopilotTokens.reduce<Set<string>>(
					(acc, { network }) => (nonNullish(network.icon) ? acc.add(network.icon) : acc),
					new Set()
				)
			],
			[EarningCardFields.ASSETS]: [
				...$allHarvestAutopilotTokens.reduce<Set<string>>(
					(acc, { assetIcon }) => (nonNullish(assetIcon) ? acc.add(assetIcon) : acc),
					new Set()
				)
			],
			[EarningCardFields.EARNING_POTENTIAL]: nonNullish($enabledMainnetFungibleTokensUsdBalance)
				? (($enabledMainnetFungibleTokensUsdBalance - $enabledHarvestAutopilotsUsdBalance) *
						Number($harvestAutopilotsMaxApy)) /
					100
				: undefined,
			disabled: $harvestAutopilots.length === 0,
			disabledNotice:
				$harvestAutopilots.length === 0
					? 'earning.cards.harvest_autopilot.no_networks_enabled'
					: undefined,
			action: () => goto(AppPath.EarnAutopilot)
		}
	})
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

export const highestApyEarning: Readable<number> = derived(
	[highestApyEarningData],
	([$highestApyEarningData]) =>
		!isNaN(Number($highestApyEarningData?.[EarningCardFields.APY]))
			? Number($highestApyEarningData?.[EarningCardFields.APY])
			: 0
);

export const highestEarningPotentialUsd: Readable<number> = derived(
	[highestApyEarning, enabledMainnetFungibleTokensUsdBalance, enabledHarvestAutopilotsUsdBalance],
	([
		$highestApyEarning,
		$enabledMainnetFungibleTokensUsdBalance,
		$enabledHarvestAutopilotsUsdBalance
	]) =>
		(($enabledMainnetFungibleTokensUsdBalance - $enabledHarvestAutopilotsUsdBalance) *
			$highestApyEarning) /
		100
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
