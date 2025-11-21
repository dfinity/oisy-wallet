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
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import IconCalendarDays from '$lib/components/icons/lucide/IconCalendarDays.svelte';
	import IconForbidden from '$lib/components/icons/IconForbidden.svelte';
	import IconTrophy from '$lib/components/icons/IconTrophy.svelte';

	const { sendTokenSymbol } = getContext<SendContext>(SEND_CONTEXT_KEY);

	//const sendTokenSymbol = readable('gldt');

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
			<IconTrophy />
		{/snippet}
		{#snippet title()}
			Staking rewards are being paid in GOLDAO tokens
		{/snippet}
	</CollapsibleListItem>
{/snippet}

{#snippet item3()}
	<CollapsibleListItem>
		{#snippet icon()}
			<IconClock />
		{/snippet}
		{#snippet title()}
			Unlock delay of 1 week
		{/snippet}
		{#snippet description()}
			When unlocking GLDT from staking, the tokens are locked for 1 week without receiving any
			further rewards, before they can be withdrawn. You can pay a 5% fee on your stake to unloc
			immediately.
		{/snippet}
	</CollapsibleListItem>
{/snippet}

{#snippet item4()}
	<CollapsibleListItem>
		{#snippet icon()}
			<span class="text-warning-primary">
				<IconCalendarDays size="16" />
			</span>
		{/snippet}
		{#snippet title()}
			Age bonus
		{/snippet}
		{#snippet description()}
			GLDT stakes start obtaining an age bonus from day 1. The older the stakes, the bigger the age
			bonus, growing linearly at 100% per year.
		{/snippet}
	</CollapsibleListItem>
{/snippet}

{#snippet item5()}
	<CollapsibleListItem>
		{#snippet icon()}
			<IconForbidden />
		{/snippet}
		{#snippet title()}
			When you start unlocking your GLDT stake, you will no longer receive new rewards
		{/snippet}
	</CollapsibleListItem>
{/snippet}

<StakeProvider provider={StakeProviderType.GLDT} data={[item1, item2, item3, item4, item5]} />
