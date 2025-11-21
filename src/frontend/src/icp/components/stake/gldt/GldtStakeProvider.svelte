<script lang="ts">
	import { type Component, getContext } from 'svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import StakeProvider from '$lib/components/stake/StakeProvider.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { StakeProvider as StakeProviderType } from '$lib/types/stake';
	import { formatStakeApyNumber } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { readable } from 'svelte/store';
	import CollapsibleListItem from '$lib/components/ui/CollapsibleListItem.svelte';

	//const { sendTokenSymbol } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const sendTokenSymbol = readable('gldt');

	const { store: gldtStakeApyStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);
</script>

{#snippet item1()}
	<CollapsibleListItem>
		{#snippet icon()}
			<IconLineChart />
		{/snippet}
		{#snippet title()}
			{replacePlaceholders($i18n.stake.text.current_apy, {
				$apy: formatStakeApyNumber($gldtStakeApyStore?.apy ?? 0)
			})}
		{/snippet}
		{#snippet description()}
			{replacePlaceholders($i18n.stake.text.current_apy_info, {
				$token: $sendTokenSymbol
			})}
		{/snippet}
	</CollapsibleListItem>
{/snippet}

{#snippet item2()}
	<CollapsibleListItem>
		{#snippet icon()}
			<IconLineChart />
		{/snippet}
		{#snippet title()}
			{replacePlaceholders($i18n.stake.text.current_apy, {
				$apy: formatStakeApyNumber($gldtStakeApyStore?.apy ?? 0)
			})}
		{/snippet}
		{#snippet description()}
			{replacePlaceholders($i18n.stake.text.current_apy_info, {
				$token: $sendTokenSymbol
			})}
		{/snippet}
	</CollapsibleListItem>
{/snippet}

{#snippet item3()}
	<CollapsibleListItem>
		{#snippet icon()}
			<IconLineChart />
		{/snippet}
		{#snippet title()}
			{replacePlaceholders($i18n.stake.text.current_apy, {
				$apy: formatStakeApyNumber($gldtStakeApyStore?.apy ?? 0)
			})}
		{/snippet}
	</CollapsibleListItem>
{/snippet}

<StakeProvider provider={StakeProviderType.GLDT} data={[item1, item2, item3]} />
