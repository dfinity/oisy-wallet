<script lang="ts">
    import {REWARDS_REQUIREMENTS_STATUS} from "$lib/constants/test-ids.constants";
    import {IconCheckCircleFill} from "@dfinity/gix-components";
    import type {CriterionEligibility} from "$declarations/rewards/rewards.did";
    import {i18n} from "$lib/stores/i18n.store";
    import {replacePlaceholders} from "$lib/utils/i18n.utils.js";
    import {nonNullish} from "@dfinity/utils";

    interface Props {
        criterion: CriterionEligibility;
    }

    let {criterion}: Props = $props();

    const getCriterionText = (criterion: CriterionEligibility): string => {
        if ('MinLogins' in criterion.criterion) {
            const {duration, count} = criterion.criterion.MinLogins;
            const {Days: days} = duration

            return replacePlaceholders($i18n.rewards.requirements.min_logins, {
                $logins: count,
                $days: days
            });
        }
        if ('MinTransactions' in criterion.criterion) {
            const {duration, count} = criterion.criterion.MinTransactions;
            const {Days: days} = duration

            return replacePlaceholders($i18n.rewards.requirements.min_transactions, {
                $transactions: count,
                $days: days
            });
        }
        if ('MinTotalAssetsUsd' in criterion.criterion) {
            const {usd} = criterion.criterion.MinTotalAssetsUsd;

            return replacePlaceholders($i18n.rewards.requirements.min_total_assets_usd, {
                $usd: usd
            });
        }
    }

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
                data-tid={`${REWARDS_REQUIREMENTS_STATUS}`}
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