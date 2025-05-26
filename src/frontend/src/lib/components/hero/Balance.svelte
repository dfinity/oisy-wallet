<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { AMOUNT_DATA } from '$lib/constants/test-ids.constants';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionTokenUi } from '$lib/types/token';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	export let token: OptionTokenUi;

	const { loading } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<span class="flex flex-col gap-2">
	<output
		data-tid={AMOUNT_DATA}
		class="inline-flex w-full flex-row justify-center gap-3 break-words text-4xl font-bold lg:text-5xl"
	>
		{#if nonNullish(token?.balance) && nonNullish(token?.symbol) && !(token.balance === ZERO)}
			{#if $isPrivacyMode}
				<IconDots variant="lg" times={6} styleClass="h-12.5 my-4.25" />
			{:else}
				<Amount
					amount={token.balance}
					decimals={token.decimals}
					symbol={getTokenDisplaySymbol(token)}
				/>
			{/if}
		{:else}
			<span class:animate-pulse={$loading}>
				{#if $isPrivacyMode}
					<IconDots variant="lg" times={6} styleClass="h-12.5 my-4.25" />
				{:else}
					0.00
				{/if}
			</span>
		{/if}
	</output>

	{#if !$isPrivacyMode}
		<span class="text-xl font-bold opacity-50">
			<TokenExchangeBalance
				balance={token?.balance}
				usdBalance={token?.usdBalance}
				nullishBalanceMessage={$i18n.hero.text.unavailable_balance}
			/>
		</span>
	{/if}
</span>
