<script lang="ts">
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import IconWallet from '$lib/components/icons/lucide/IconWallet.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const cards = $derived([
		{
			id: 'asset_types',
			icon: IconWallet,
			label: $i18n.auth.text.asset_types
		},
		{
			id: 'advanced_cryptography',
			icon: IconShieldCheck,
			label: $i18n.auth.text.advanced_cryptography
		},
		{
			id: 'move_swap_grow',
			icon: IconLineChart,
			label: $i18n.auth.text.move_swap_grow
		}
	]);
</script>

<div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 1.5md:grid-cols-3">
	{#each cards as { id, icon: IconCmp, label } (id)}
		<div
			class="feature-card flex min-h-32 flex-col justify-between gap-4 rounded-xl border border-brand-subtle-20 py-4 pr-12 pl-4 text-primary backdrop-blur-md sm:min-h-44 sm:rounded-3xl"
		>
			<div class="flex size-8 items-center justify-start text-brand-primary sm:size-10">
				<IconCmp size="32" />
			</div>

			<p class="m-0 text-2xl leading-tight font-normal">
				{label}
			</p>
		</div>
	{/each}
</div>

<style lang="scss">
	.feature-card {
		background:
			linear-gradient(
				0deg,
				var(--color-background-brand-subtle-10),
				var(--color-background-brand-subtle-10)
			),
			var(--color-background-primary-light);
	}
</style>
