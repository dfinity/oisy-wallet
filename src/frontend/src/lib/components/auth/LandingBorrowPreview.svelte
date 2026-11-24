<script lang="ts">
	import bitcoin from '$btc/assets/bitcoin.svg?inline';
	import usdCoin from '$eth/assets/usdc.svg?inline';
	import LandingPreviewFrame from '$lib/components/auth/LandingPreviewFrame.svelte';
	import IconCircleCheck from '$lib/components/icons/lucide/IconCircleCheck.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	// Sample position for the illustration only.
	const health = 72;

	const rows = $derived([
		{
			label: $i18n.liquidium.text.collateral,
			icon: bitcoin,
			amount: '0.25 BTC',
			value: '$16,020.00'
		},
		{
			label: $i18n.auth.landing.borrow_loan,
			icon: usdCoin,
			amount: '4,000 USDC',
			value: '$4,000.00'
		}
	]);
</script>

<LandingPreviewFrame label={$i18n.auth.landing.borrow_preview}>
	<div class="flex flex-col gap-5 p-3 sm:p-7">
		<div class="grid gap-2 sm:grid-cols-2">
			{#each rows as { label, icon, amount, value } (label)}
				<div class="flex flex-col gap-3 rounded-2xl bg-secondary p-4">
					<span class="text-sm text-tertiary">{label}</span>
					<span class="flex items-center gap-3">
						<img class="size-9 rounded-full" alt="" src={icon} />
						<span class="flex flex-col">
							<span class="text-xl font-bold tracking-tight text-primary">{amount}</span>
							<span class="text-sm text-tertiary">{value}</span>
						</span>
					</span>
				</div>
			{/each}
		</div>

		<div class="flex flex-col gap-3 rounded-2xl bg-secondary p-4">
			<div class="flex items-center justify-between gap-3">
				<span class="text-sm text-tertiary">{$i18n.auth.landing.borrow_health}</span>
				<span class="flex items-center gap-1.5 text-sm font-semibold text-success-primary">
					<IconCircleCheck size="16" />
					{$i18n.auth.landing.borrow_healthy}
					<span>{health}%</span>
				</span>
			</div>
			<span class="h-2 overflow-hidden rounded-full bg-tertiary">
				<span style:width={`${health}%`} class="block h-full rounded-full bg-success-primary"
				></span>
			</span>
		</div>

		<span
			class="flex h-12 items-center justify-center rounded-2xl bg-brand-primary font-bold text-primary-inverted"
		>
			{$i18n.liquidium.text.action_borrow}
		</span>
	</div>
</LandingPreviewFrame>
