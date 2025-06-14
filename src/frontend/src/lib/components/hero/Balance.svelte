<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import { AMOUNT_DATA } from '$lib/constants/test-ids.constants';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionTokenUi } from '$lib/types/token';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: OptionTokenUi;
	}

	let { token }: Props = $props();

	const { loading } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<span class="flex flex-col gap-2">
	<output
		data-tid={AMOUNT_DATA}
		class="inline-flex w-full flex-row justify-center gap-3 break-words text-4xl font-bold lg:text-5xl"
	>
		{#if nonNullish(token?.balance) && nonNullish(token?.symbol)}
			{#if $isPrivacyMode}
				<IconDots variant="lg" times={6} styleClass="my-4.25" />
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
					<IconDots variant="lg" times={6} styleClass="my-4.25" />
				{:else}
					0.00
				{/if}
			</span>
		{/if}
	</output>
	<span class="text-xl font-bold opacity-50">
		{#if !$isPrivacyMode}
			<TokenExchangeBalance
				balance={token?.balance}
				usdBalance={token?.usdBalance}
				nullishBalanceMessage={$i18n.hero.text.unavailable_balance}
			/>
		{:else}
			<span class="flex items-center justify-center gap-2">
				<IconEyeOff />
				{$i18n.hero.text.hidden_balance}
			</span>
		{/if}
	</span>
</span>
