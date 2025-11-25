<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { getContext } from 'svelte';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import IconForbidden from '$lib/components/icons/IconForbidden.svelte';
	import IconTrophy from '$lib/components/icons/IconTrophy.svelte';
	import IconCalendarDays from '$lib/components/icons/lucide/IconCalendarDays.svelte';
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import StakeProvider from '$lib/components/stake/StakeProvider.svelte';
	import CollapsibleListItem from '$lib/components/ui/CollapsibleListItem.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { StakeProvider as StakeProviderType } from '$lib/types/stake';
	import { componentToHtml } from '$lib/utils/component.utils';
	import { formatStakeApyNumber } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const { sendTokenSymbol } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { store: gldtStakeApyStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);
</script>

{#snippet item1()}
	<CollapsibleListItem>
		{#snippet icon()}
			<span class="text-warning-primary">
				<IconLineChart />
			</span>
		{/snippet}
		{#snippet title()}
			{replacePlaceholders($i18n.stake.terms.gldt.item1_title, {
				$apy: formatStakeApyNumber($gldtStakeApyStore?.apy ?? 0)
			})}
		{/snippet}
		{#snippet description()}
			{replacePlaceholders($i18n.stake.terms.gldt.item1_description, {
				$token: $sendTokenSymbol
			})}
		{/snippet}
	</CollapsibleListItem>
{/snippet}

{#snippet item2()}
	<CollapsibleListItem>
		{#snippet icon()}
			<span class="text-warning-primary">
				<IconTrophy />
			</span>
		{/snippet}
		{#snippet title()}
			<span class="flex gap-1">
				<Html
					text={replacePlaceholders($i18n.stake.terms.gldt.item2_title, {
						$icon: componentToHtml({
							Component: Logo,
							props: {
								alt: stakeProvidersConfig[StakeProviderType.GLDT].name,
								src: stakeProvidersConfig[StakeProviderType.GLDT].logo
							}
						}).replace('opacity-10', '')
					})}
				/>
			</span>
		{/snippet}
	</CollapsibleListItem>
{/snippet}

{#snippet item3()}
	<CollapsibleListItem>
		{#snippet icon()}
			<span class="text-warning-primary">
				<IconClock />
			</span>
		{/snippet}
		{#snippet title()}
			{$i18n.stake.terms.gldt.item3_title}
		{/snippet}
		{#snippet description()}
			{$i18n.stake.terms.gldt.item3_description}
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
			{$i18n.stake.terms.gldt.item4_title}
		{/snippet}
		{#snippet description()}
			{$i18n.stake.terms.gldt.item4_description}
		{/snippet}
	</CollapsibleListItem>
{/snippet}

{#snippet item5()}
	<CollapsibleListItem>
		{#snippet icon()}
			<span class="text-warning-primary">
				<IconForbidden />
			</span>
		{/snippet}
		{#snippet title()}
			{$i18n.stake.terms.gldt.item5_title}
		{/snippet}
	</CollapsibleListItem>
{/snippet}

<StakeProvider data={[item1, item2, item3, item4, item5]} provider={StakeProviderType.GLDT} />
