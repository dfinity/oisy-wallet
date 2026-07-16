<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenNameAndNetwork from '$lib/components/tokens/TokenNameAndNetwork.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import { isMobile } from '$lib/utils/device.utils';
	import { formatStakeApyNumber } from '$lib/utils/format.utils';

	interface Props {
		market: LiquidiumMarket;
	}

	let { market }: Props = $props();

	// Hard-coded teaser row (e.g. ICP) advertises the asset with disabled rates.
	let isTeaser = $derived(market.teaser === true);

	let token = $derived(isTeaser ? ICP_TOKEN : LIQUIDIUM_ASSET_TOKENS[market.asset]);

	// Actions live in the hero / section headers, so markets rows are informational only:
	// a teaser or an unavailable pool (frozen / cap) shows "Coming soon" instead of rates.
	let comingSoon = $derived(isTeaser || !market.available);
</script>

{#snippet rates()}
	{#if comingSoon}
		<span class="text-sm font-semibold text-success-primary">
			{$i18n.liquidium.text.coming_soon_teaser}
		</span>
	{:else}
		<span class="text-sm font-normal">
			{$i18n.liquidium.text.supply_label}
			<span class="font-semibold text-success-primary"
				>{formatStakeApyNumber(market.supplyApy)}%</span
			>
			· {$i18n.liquidium.text.borrow_label}
			<span class="font-semibold text-warning-primary"
				>{formatStakeApyNumber(market.borrowApy)}%</span
			>
		</span>
	{/if}
{/snippet}

<LogoButton hover={false}>
	{#snippet logo()}
		<span class="sm:mr-2 flex">
			{#if nonNullish(token)}
				<TokenLogo
					badge={{ type: 'network' }}
					color="white"
					data={token}
					logoSize={isMobile() ? 'sm' : 'lg'}
				/>
			{/if}
		</span>
	{/snippet}

	{#snippet title()}
		<span class="text-sm font-bold sm:text-base">{market.asset}</span>
	{/snippet}

	{#snippet description()}
		<span class="flex flex-col">
			<!-- Wrapped so name + network stay on one line inside the column. -->
			{#if nonNullish(token)}
				<span><TokenNameAndNetwork data={token} /></span>
			{/if}

			<!-- xs only: the rates that otherwise live in titleEnd. -->
			<span class="sm:hidden">{@render rates()}</span>
		</span>
	{/snippet}

	{#snippet titleEnd()}
		<!-- On sm+ the rates sit on the right; on xs they drop to the description's second line. -->
		<span class="hidden sm:block">{@render rates()}</span>
	{/snippet}
</LogoButton>
