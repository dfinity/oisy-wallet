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
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionTokenUi } from '$lib/types/token';
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
	<div class="flex flex-col items-center">
		<Button
			transparent
			fullWidth
			ariaLabel="Set privacy mode on and off"
			styleClass="bg-transparent p-0 text-xl font-bold"
			ondblclick={() =>
				setPrivacyMode({
					enabled: !$isPrivacyMode,
					withToast: false,
					source: 'Double click on the Balance'
				})}
		>
			{#if !$isPrivacyMode}
				<DelayedTooltip text={$i18n.hero.text.tooltip_toggle_balance}>
					<TokenExchangeBalance
						balance={token?.balance}
						usdBalance={token?.usdBalance}
						nullishBalanceMessage={$i18n.hero.text.unavailable_balance}
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
