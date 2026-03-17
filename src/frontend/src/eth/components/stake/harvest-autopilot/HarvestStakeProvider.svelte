<script lang="ts">
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import StakeProvider from '$lib/components/stake/StakeProvider.svelte';
	import CollapsibleListItem from '$lib/components/ui/CollapsibleListItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { StakeProvider as StakeProviderType } from '$lib/types/stake';
	import { formatStakeApyNumber } from '$lib/utils/format.utils';

	interface Props {
		apy: number;
	}

	const { apy }: Props = $props();
</script>

{#snippet item1()}
	<CollapsibleListItem noBorder={true}>
		{#snippet icon()}
			<span class="text-warning-primary">
				<IconLineChart />
			</span>
		{/snippet}

		{#snippet title()}
			{`${$i18n.stake.text.current_apy_label} ${formatStakeApyNumber(apy)}%`}
		{/snippet}

		{#snippet description()}
			{$i18n.stake.text.harvest_autopilot_provider_description}
		{/snippet}
	</CollapsibleListItem>
{/snippet}

<StakeProvider
	provider={StakeProviderType.HARVEST_AUTOPILOTS}
	showAllTerms={false}
	terms={[item1]}
/>
