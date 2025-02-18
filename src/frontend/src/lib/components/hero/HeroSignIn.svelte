<script lang="ts">
	import type { ComponentType } from 'svelte';
	import ButtonAuthenticateWithLicense from '$lib/components/auth/ButtonAuthenticateWithLicense.svelte';
	import IconScanFace from '$lib/components/icons/lucide/IconScanFace.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import IconWallet from '$lib/components/icons/lucide/IconWallet.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	let infoList: { label: string; icon: ComponentType }[];
	$: infoList = [
		{
			label: $i18n.auth.text.asset_types,
			icon: IconWallet
		},
		{
			label: $i18n.auth.text.instant_and_private,
			icon: IconScanFace
		},
		{
			label: $i18n.auth.text.advanced_cryptography,
			icon: IconShieldCheck
		}
	];
</script>

<div class="lg:mb-20 flex flex-col items-center text-center md:items-start md:text-left">
	<div class="mt-5 mb-7 pt-2">
		<h1 class="text-4xl md:leading-tight lg:text-5xl">
			{$i18n.auth.text.title_part_1}<br /><span class="text-brand-primary"
				>{$i18n.auth.text.title_part_2}</span
			>
		</h1>
	</div>

	<div class="mb-7 gap-2 md:gap-3 md:text-lg flex flex-col items-center md:items-start">
		{#each infoList as { label, icon }}
			<div class="gap-4 flex items-center">
				<div class="hidden md:block">
					<svelte:component this={icon} />
				</div>
				{label}
			</div>
		{/each}
	</div>

	<ButtonAuthenticateWithLicense />
</div>
