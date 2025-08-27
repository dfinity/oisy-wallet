<script lang="ts">
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import IconScanFace from '$lib/components/icons/lucide/IconScanFace.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import IconWallet from '$lib/components/icons/lucide/IconWallet.svelte';
	import InviteRewardsBanner from '$lib/components/ui/InviteRewardsBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { NEW_AGREEMENTS_ENABLED } from '$env/agreements.env';
	import ButtonAuthenticateWithLicense from '$lib/components/auth/ButtonAuthenticateWithLicense.svelte';

	const infoList = $derived([
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
	]);
</script>

<div class="flex flex-col items-center text-center md:items-start md:text-left lg:mb-20">
	<!-- Invite Rewards Banner -->
	<div class="flex justify-center md:justify-start">
		<InviteRewardsBanner />
	</div>

	<div class="mb-7 mt-5 pt-2">
		<h1 class="text-4xl md:leading-tight lg:text-5xl">
			{replaceOisyPlaceholders($i18n.auth.text.title_part_1)}<br /><span
				class="text-brand-primary-alt">{$i18n.auth.text.title_part_2}</span
			>
		</h1>
	</div>

	<div class="mb-7 flex flex-col items-center gap-2 md:items-start md:gap-3 md:text-lg">
		{#each infoList as { label, icon: IconCmp } (label)}
			<div class="flex items-center gap-4">
				<div class="hidden md:block">
					<IconCmp />
				</div>
				{label}
			</div>
		{/each}
	</div>

	{#if NEW_AGREEMENTS_ENABLED}
		<ButtonAuthenticateWithHelp needHelpLink={false} />
	{:else}
		<ButtonAuthenticateWithLicense />
	{/if}
</div>
