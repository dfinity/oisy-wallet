<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import TokenExchangeBalance from '$lib/components/tokens/TokenExchangeBalance.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DelayedTooltip from '$lib/components/ui/DelayedTooltip.svelte';
	import { AMOUNT_DATA } from '$lib/constants/test-ids.constants';
	import { currentCurrencySymbol } from '$lib/derived/currency.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionTokenUi } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { setPrivacyMode } from '$lib/utils/privacy.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: OptionTokenUi;
	}

	let { token }: Props = $props();

	const { loading } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<span class="flex flex-col gap-1">
	<output
		class="inline-flex w-full flex-row justify-center gap-3 break-words text-4xl font-bold md:text-5xl"
		data-tid={AMOUNT_DATA}
	>
		{#if nonNullish(token?.balance) && nonNullish(token?.symbol)}
			{#if $isPrivacyMode}
				<IconDots styleClass="my-4.25" times={6} variant="lg" />
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
					<IconDots styleClass="my-4.25" times={6} variant="lg" />
				{:else}
					0.00
				{/if}
			</span>
		{/if}
	</output>
	<div class="flex flex-col items-center">
		<Button
			ariaLabel={$i18n.hero.alt.toggle_privacy_mode}
			fullWidth
			ondblclick={() =>
				setPrivacyMode({
					enabled: !$isPrivacyMode,
					withToast: false,
					source: 'Hero - Double click on the Balance'
				})}
			styleClass="bg-transparent p-0 text-xl font-medium"
			transparent
		>
			{#if !$isPrivacyMode}
				<DelayedTooltip text={$i18n.hero.text.tooltip_toggle_balance}>
					<TokenExchangeBalance
						balance={token?.balance}
						nullishBalanceMessage={replacePlaceholders($i18n.hero.text.unavailable_balance, {
							$currencySymbol: $currentCurrencySymbol
						})}
						usdBalance={token?.usdBalance}
					/>
				</DelayedTooltip>
			{:else}
				<DelayedTooltip text={$i18n.hero.text.tooltip_toggle_balance}>
					<span class="flex items-center justify-center gap-2">
						<IconEyeOff />
						{$i18n.hero.text.hidden_balance}
					</span>
				</DelayedTooltip>
			{/if}
		</Button>
	</div>
</span>
