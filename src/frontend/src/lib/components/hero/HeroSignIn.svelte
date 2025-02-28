<script lang="ts">
	import type { ComponentType } from 'svelte';
	import ButtonAuthenticateWithLicense from '$lib/components/auth/ButtonAuthenticateWithLicense.svelte';
	import IconScanFace from '$lib/components/icons/lucide/IconScanFace.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import IconWallet from '$lib/components/icons/lucide/IconWallet.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

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

<div class="flex flex-col items-center text-center md:items-start md:text-left lg:mb-20">
	<div class="mb-7 mt-5 pt-2">
		<h1 class="text-4xl md:leading-tight lg:text-5xl">
			{replaceOisyPlaceholders($i18n.auth.text.title_part_1)}<br /><span class="text-brand-primary"
				>{$i18n.auth.text.title_part_2}</span
			>
		</h1>
	</div>

	<div class="mb-7 flex flex-col items-center gap-2 md:items-start md:gap-3 md:text-lg">
		{#each infoList as { label, icon }}
			<div class="flex items-center gap-4">
				<div class="hidden md:block">
					<svelte:component this={icon} />
				</div>
				{label}
			</div>
		{/each}
	</div>

	<ButtonAuthenticateWithLicense />
</div>
