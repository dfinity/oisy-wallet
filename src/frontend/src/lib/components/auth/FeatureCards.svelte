<script lang="ts">
	import IconSocialLogin from '$lib/components/icons/IconSocialLogin.svelte';
	import IconScanFace from '$lib/components/icons/lucide/IconScanFace.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import IconSparkles from '$lib/components/icons/lucide/IconSparkles.svelte';
	import IconWallet from '$lib/components/icons/lucide/IconWallet.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const cards = $derived([
		{
			icon: IconWallet,
			label: $i18n.auth.text.asset_types
		},
		{
			icon: IconShieldCheck,
			label: $i18n.auth.text.advanced_cryptography
		},
		{
			icon: IconSparkles,
			label: $i18n.auth.text.instant_and_private
		},
		{
			icon: IconScanFace,
			label: $i18n.auth.text.social_login,
			extra: IconSocialLogin
		}
	]);
</script>

<div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 1.5md:grid-cols-4">
	{#each cards as { icon: IconCmp, label, extra: ExtraCmp } (label)}
		<div
			class="flex min-h-32 flex-col justify-between gap-4 rounded-xl border border-brand-subtle-10 bg-brand-subtle-10 py-4 pr-12 pl-4 text-primary backdrop-blur-md sm:min-h-44 sm:rounded-3xl"
		>
			<div class="flex size-8 items-center justify-start text-brand-primary sm:size-10">
				<IconCmp />
			</div>

			{#if ExtraCmp}
				<div class="flex items-center">
					<ExtraCmp />
				</div>
			{/if}

			<p class="m-0 text-lg leading-tight">
				{label}
			</p>
		</div>
	{/each}
</div>
