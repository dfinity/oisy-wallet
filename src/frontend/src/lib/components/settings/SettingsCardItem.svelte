<script lang="ts">
	import { slide } from 'svelte/transition';
	import IconHelp from '$lib/components/icons/IconHelp.svelte';

	const SLOTS = $$props.$$slots;

	export let permanentInfo: boolean = false;

	let infoExpanded: boolean;
	$: infoExpanded = permanentInfo;
</script>

<div class="mt-3 flex w-full flex-row">
	<span class="flex w-full flex-1 flex-row items-start">
		<span class="flex"><slot name="key" /></span>
		{#if SLOTS.info && !permanentInfo}
			<button
				class="ml-1 flex p-0.5 align-top text-tertiary"
				on:click={() => (infoExpanded = !infoExpanded)}
			>
				<IconHelp size="18" />
			</button>
		{/if}
	</span>

	<span class="flex"><slot name="value" /></span>
</div>

{#if infoExpanded}
	<span class="w-100 mt-1 flex text-sm text-tertiary" transition:slide><slot name="info" /></span>
{/if}
