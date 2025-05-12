<script lang="ts">
	import {IconCheckCircleFill} from '@dfinity/gix-components';
	import {nonNullish} from '@dfinity/utils';
	import type {CampaignCriterion} from "$lib/types/reward";
	import {RewardCriterionType} from "$lib/enums/reward-criterion-type";
	import {replacePlaceholders} from "$lib/utils/i18n.utils";
	import {i18n} from "$lib/stores/i18n.store";

	interface Props {
		criterion: CampaignCriterion;
		testId?: string;
	}

	let { criterion, testId }: Props = $props();

	const getCriterionText = (criterion: CampaignCriterion): string | undefined => {
		if (RewardCriterionType.MIN_LOGINS === criterion.type) {
			return replacePlaceholders($i18n.rewards.requirements.min_logins, {
				$logins: criterion.count.toString(),
				$days: criterion.days.toString()
			});
		}
		if (RewardCriterionType.MIN_TRANSACTIONS === criterion.type) {
			return replacePlaceholders($i18n.rewards.requirements.min_transactions, {
				$transactions: criterion.count.toString(),
				$days: criterion.days.toString()
			});
		}
		if (RewardCriterionType.MIN_TOTAL_ASSETS_USD === criterion.type) {
			return replacePlaceholders($i18n.rewards.requirements.min_total_assets_usd, {
				$usd: criterion.usd.toString()
			});
		}
	};

	const criterionText = $derived(getCriterionText(criterion));
</script>

{#if nonNullish(criterionText)}
	<span
		class="flex w-full flex-row"
		class:transition={!criterion.satisfied}
		class:duration-500={!criterion.satisfied}
		class:ease-in-out={!criterion.satisfied}
	>
		<span
			data-tid={testId}
			class="-mt-0.5 mr-2"
			class:text-success-primary={criterion.satisfied}
			class:text-disabled={!criterion.satisfied}
		>
			<IconCheckCircleFill size={32} />
		</span>
		<span>
			{criterionText}
		</span>
	</span>
{/if}
