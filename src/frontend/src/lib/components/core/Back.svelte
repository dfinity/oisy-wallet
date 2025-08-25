<script lang="ts">
	import { IconBack } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { back } from '$lib/utils/nav.utils';

	export let color: 'primary' | 'current' = 'primary';
	export let onlyArrow = false;

	let fromRoute: NavigationTarget | null;

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<button
	class="pointer-events-auto flex gap-0.5 font-bold"
	class:icon={onlyArrow}
	class:text-brand-primary={color === 'primary'}
	class:text-current={color === 'current'}
	aria-label={$i18n.core.alt.back}
	on:click={() => back({ pop: nonNullish(fromRoute) })}
>
	{#if onlyArrow}
		<IconBackArrow />
		<span class="visually-hidden">{$i18n.core.text.back}</span>
	{:else}
		<IconBack />
		{$i18n.core.text.back}
	{/if}
</button>
