<script lang="ts">
	import IconRocket from '$lib/components/icons/lucide/IconRocket.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import IconSparkles from '$lib/components/icons/lucide/IconSparkles.svelte';
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
			icon: IconRocket,
			label: $i18n.auth.text.move_swap_grow
		},
		{
			id: 'instant_and_private',
			icon: IconSparkles,
			label: $i18n.auth.text.instant_and_private
		}
	]);
</script>

<div class="1.5md:grid-cols-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
	{#each cards as { id, icon: IconCmp, label } (id)}
		<div
			class="feature-card border-brand-subtle-20 text-primary flex min-h-32 flex-col justify-between gap-4 rounded-xl border py-4 pr-12 pl-4 backdrop-blur-md sm:min-h-44 sm:rounded-3xl"
		>
			<div class="text-brand-primary flex size-8 items-center justify-start sm:size-10">
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
