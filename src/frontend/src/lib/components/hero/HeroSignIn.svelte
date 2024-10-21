<script lang="ts">
	import type { ComponentType } from 'svelte';
	import IconGlasses from '$lib/components/icons/lucide/IconGlasses.svelte';
	import IconInfinity from '$lib/components/icons/lucide/IconInfinity.svelte';
	import IconShieldAlert from '$lib/components/icons/lucide/IconShieldAlert.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';

	let infoList: { label: string; icon: ComponentType }[];
	$: infoList = [
		{
			label: $i18n.auth.text.safe_access,
			icon: IconShieldAlert
		},
		{
			label: $i18n.auth.text.privacy_and_security,
			icon: IconGlasses
		},
		{
			label: $i18n.auth.text.powered_by_chain_fusion,
			icon: IconInfinity
		}
	];
</script>

<div class="flex flex-col items-center text-center md:items-start md:text-left">
	<div class="mb-7 mt-5 pt-2">
		<h1 class="text-4xl md:text-5xl md:leading-tight">
			{$i18n.auth.text.title_part_1}<br /><span class="text-primary"
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

	<ButtonAuthenticate on:click={async () => await signIn({})} />
</div>
