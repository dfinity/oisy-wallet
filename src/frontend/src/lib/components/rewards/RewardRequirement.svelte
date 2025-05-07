<script lang="ts">
    import {REWARDS_REQUIREMENTS_STATUS} from "$lib/constants/test-ids.constants";
    import {IconCheckCircleFill} from "@dfinity/gix-components";
    import type {CriterionEligibility} from "$declarations/rewards/rewards.did";
    import {i18n} from "$lib/stores/i18n.store";
    import {replacePlaceholders} from "$lib/utils/i18n.utils.js";
    import {nonNullish} from "@dfinity/utils";

    interface Props {
        criterion: CriterionEligibility;
        testId?: string;
    }

    let {criterion, testId}: Props = $props();

    const getCriterionText = (criterion: CriterionEligibility): string | undefined => {
        if ('MinLogins' in criterion.criterion) {
            const {duration, count} = criterion.criterion.MinLogins;
            if ('Days' in duration) {
                const days = duration.Days;
                return replacePlaceholders($i18n.rewards.requirements.min_logins, {
                    $logins: count.toString(),
                    $days: days.toString()
                });
            }
        }
        if ('MinTransactions' in criterion.criterion) {
            const {duration, count} = criterion.criterion.MinTransactions;
            if ('Days' in duration) {
                const days = duration.Days;
                return replacePlaceholders($i18n.rewards.requirements.min_transactions, {
                    $transactions: count.toString(),
                    $days: days.toString()
                });
            }
        }
        if ('MinTotalAssetsUsd' in criterion.criterion) {
            const {usd} = criterion.criterion.MinTotalAssetsUsd;

            return replacePlaceholders($i18n.rewards.requirements.min_total_assets_usd, {
                $usd: usd.toString()
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