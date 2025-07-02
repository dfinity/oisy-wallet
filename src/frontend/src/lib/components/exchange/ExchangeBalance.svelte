<script lang="ts">
	import { Tooltip } from '@dfinity/gix-components';
	import { getContext } from 'svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import { allBalancesZero } from '$lib/derived/balances.derived';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatUSD } from '$lib/utils/format.utils';
	import { setPrivacyMode } from '$lib/utils/privacy.utils';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';

	interface Props {
		hideBalance?: boolean;
	}

	let { hideBalance = false }: Props = $props();

	const { loaded } = getContext<HeroContext>(HERO_CONTEXT_KEY);

	const totalUsd = $derived(sumTokensUiUsdBalance($combinedDerivedSortedNetworkTokensUi));
</script>

<span class="flex flex-col items-center gap-4">
	<output class="mt-8 inline-block break-all text-5xl font-bold">
		{#if $loaded}
			{#if hideBalance}
				<IconDots variant="lg" times={6} styleClass="my-4.25" />
			{:else}
				{formatUSD({ value: totalUsd })}
			{/if}
		{:else}
			<span class="animate-pulse">
				{#if hideBalance}
					<IconDots variant="lg" times={6} styleClass="my-4.25" />
				{:else}
					{formatUSD({ value: 0 })}
				{/if}
			</span>
		{/if}
	</output>
	<span
		class="flex cursor-pointer flex-col items-center gap-4 text-xl font-medium text-brand-secondary-alt"
		role="button"
		tabindex="0"
		ondblclick={() => setPrivacyMode({ enabled: !$isPrivacyMode, withToast: true, source: 'Double click on the ExchangeBalance' })}
	>
		{#if hideBalance}
			<Tooltip text={$i18n.hero.text.tooltip_toggle_balance}>
				<span class="flex items-center gap-2 sm:max-w-none">
					<IconEyeOff />{$i18n.hero.text.hidden_balance}
				</span>
			</Tooltip>
		{:else}
			<Tooltip text={$i18n.hero.text.tooltip_toggle_balance}>
				{$allBalancesZero ? $i18n.hero.text.top_up : $i18n.hero.text.available_balance}
			</Tooltip>
		{/if}
	</span>
</span>
