<script lang="ts">
	import IconRepeat from '$lib/components/icons/IconRepeat.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { OISY_TRADE_LEARN_MORE_URL } from '$lib/constants/oisy-trade.constants';
	import { TRADING_ONBOARDING_DEPOSIT_BUTTON } from '$lib/constants/test-ids.constants';
	import { oisyTradeSupportedTokenSymbols } from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onDeposit: () => void;
	}

	let { onDeposit }: Props = $props();

	const steps = $derived([
		$i18n.trading.onboarding.step_deposit,
		$i18n.trading.onboarding.step_order,
		$i18n.trading.onboarding.step_withdraw
	]);
</script>

<div class="flex flex-col items-center gap-4 rounded-xl bg-secondary p-6 text-center">
	<RoundedIcon icon={IconRepeat} size="20" />

	<div class="flex flex-col gap-2">
		<h4>{$i18n.trading.onboarding.title}</h4>
		<p class="text-tertiary">{$i18n.trading.onboarding.description}</p>
	</div>

	<ol class="flex w-full flex-col gap-2 text-left">
		{#each steps as step, index (step)}
			<li class="flex items-center gap-3">
				<span
					class="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-subtle-20 text-sm font-semibold text-brand-primary"
				>
					{index + 1}
				</span>
				<span>{step}</span>
			</li>
		{/each}
	</ol>

	<div class="flex w-full flex-col gap-2">
		<span class="text-left text-sm text-tertiary">{$i18n.trading.onboarding.supported_tokens}</span>
		<div class="flex flex-wrap gap-2">
			{#each $oisyTradeSupportedTokenSymbols as symbol (symbol)}
				<span class="rounded-full border-1 border-tertiary bg-primary px-3 py-1 text-sm">
					{symbol}
				</span>
			{/each}
		</div>
	</div>

	<div class="mt-2 flex w-full flex-col items-center gap-3">
		<Button onclick={onDeposit} testId={TRADING_ONBOARDING_DEPOSIT_BUTTON}>
			{$i18n.trading.onboarding.deposit}
		</Button>
		<ExternalLink
			ariaLabel={$i18n.trading.text.learn_more}
			color="blue"
			href={OISY_TRADE_LEARN_MORE_URL}
			iconVisible={false}
			inline
		>
			{$i18n.trading.text.learn_more}
		</ExternalLink>
	</div>
</div>
