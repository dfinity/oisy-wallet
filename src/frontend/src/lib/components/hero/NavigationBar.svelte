<script lang="ts">
	import { IconDown, IconUp, IconWallet } from '@dfinity/gix-components';
	import type { Page } from '@sveltejs/kit';
	import type { ComponentType } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';
	import ButtonNavigation from '$lib/components/ui/ButtonNavigation.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { isRoute } from '$lib/utils/nav.utils';

	const buttonList: { icon: ComponentType; label: string; route: string; ariaLabel: string }[] = [
		{
			icon: IconWallet,
			label: $i18n.tokens.text.balance,
			route: '/balances',
			ariaLabel: $i18n.navigation.alt.balance
		},
		{
			icon: IconDown,
			label: $i18n.receive.text.receive,
			route: '/receive',
			ariaLabel: $i18n.navigation.alt.receive
		},
		{
			icon: IconUp,
			label: $i18n.send.text.send,
			route: '/send',
			ariaLabel: $i18n.navigation.alt.send
		},
		{
			icon: IconConvert,
			label: $i18n.convert.text.convert,
			route: '/convert',
			ariaLabel: $i18n.navigation.alt.convert
		}
	];

	let currentPage: Page;
	$: currentPage = $page;
</script>

<div class="flex flex-row justify-between gap-0 sm:gap-6">
	{#each buttonList as { icon, label, route, ariaLabel }}
		<ButtonNavigation
			{ariaLabel}
			on:click={() => goto(route)}
			selected={isRoute({ route, page: currentPage })}
		>
			<svelte:component this={icon} slot="icon" size="20" />
			{label}
		</ButtonNavigation>
	{/each}
</div>
