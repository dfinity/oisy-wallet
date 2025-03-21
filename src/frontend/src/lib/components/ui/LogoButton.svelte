<script lang="ts">
	import { IconCheck, Toggle } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';

	export let title: string;
	export let subtitle: string | undefined = undefined;
	export let titleEnd: string | undefined = undefined;
	export let description: string | undefined = undefined;
	export let descriptionEnd: string | undefined = undefined;

	export let selectable = false;
	export let selected = false;

	export let dividers = true;
	export let hover = true;

	let hasActionSlot: boolean;
	$: hasActionSlot = nonNullish($$slots['action']);
</script>

<div class="rounded-lg" class:hover:bg-brand-subtle-10={hover}>
	<button on:click class="flex w-full border-0 px-2">
		<span
			class="flex w-full flex-row justify-between rounded-none border-l-0 border-r-0 border-t-0 py-2"
			class:border-brand-subtle-20={dividers}
			class:border-b={dividers}
		>
			<span class="flex items-center">
				<span class="pr-2"><slot name="logo" /></span>
				<span class="flex flex-col text-left">
					<span class="text-md">
						<span class="float-left font-bold">{title}</span>
						{#if nonNullish(subtitle)}<span class="float-left text-tertiary">
								&nbsp;&middot;&nbsp;{subtitle}</span
							>{/if}
					</span>
					{#if nonNullish(description)}
						<span class="text-sm text-tertiary">
							{description}
						</span>
					{/if}
				</span>
			</span>

			<span class="flex items-center">
				<span class="flex flex-col text-right">
					{#if nonNullish(titleEnd)}
						<span class="text-md font-bold">
							{titleEnd}
						</span>
					{/if}
					{#if nonNullish(descriptionEnd)}
						<span class="text-sm text-tertiary">
							{descriptionEnd}
						</span>
					{/if}
				</span>

				{#if selectable && selected}
					<span in:fade class="ml-2 flex text-brand-primary"><IconCheck size="20px" /></span>
				{/if}

				{#if hasActionSlot}
					<span in:fade class="ml-2 flex text-brand-primary"><slot name="action" /></span>
				{/if}
			</span>
		</span>
	</button>
</div>
