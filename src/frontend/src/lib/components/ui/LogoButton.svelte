<script lang="ts">
	import { IconCheck } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';

	export let selectable = false;
	export let selected = false;
	export let dividers = false;
	export let hover = true;
	export let rounded = true;
	export let condensed = false;
	export let styleClass: string | undefined = undefined;
	export let testId: string | undefined = undefined;

	let hasTitleSlot: boolean;
	$: hasTitleSlot = nonNullish($$slots['title']);

	let hasSubtitleSlot: boolean;
	$: hasSubtitleSlot = nonNullish($$slots['subtitle']);

	let hasTitleEndSlot: boolean;
	$: hasTitleEndSlot = nonNullish($$slots['title-end']);

	let hasDescriptionSlot: boolean;
	$: hasDescriptionSlot = nonNullish($$slots['description']);

	let hasDescriptionEndSlot: boolean;
	$: hasDescriptionEndSlot = nonNullish($$slots['description-end']);

	let hasActionSlot: boolean;
	$: hasActionSlot = nonNullish($$slots['action']);
</script>

<div
	class="flex"
	class:w-full={dividers}
	class:hover:bg-brand-subtle-10={hover}
	class:rounded-lg={rounded}
>
	<button on:click class="flex w-full border-0 px-2" data-tid={testId}>
		<span
			class="logo-button-wrapper flex w-full flex-row justify-between rounded-none border-l-0 border-r-0 border-t-0"
			class:py-3={!condensed}
			class:py-1={condensed}
			class:border-brand-subtle-20={dividers}
			class:border-b={dividers}
		>
			<span class="flex min-w-0 items-center">
				{#if selectable}
					<span in:fade class="mr-2 flex min-w-4 text-brand-primary">
						{#if selected}
							<IconCheck size="16px" />
						{/if}
					</span>
				{/if}
				<span class="mr-2 flex"><slot name="logo" /></span>
				<span class="flex min-w-0 flex-col text-left">
					<span class="truncate text-nowrap">
						{#if hasTitleSlot}
							<span class="text-lg font-bold text-primary"><slot name="title" /></span>
						{/if}
						{#if hasSubtitleSlot}
							{#if dividers}
								<span class="text-lg text-tertiary">&nbsp;&middot;&nbsp;</span>
							{/if}
							<span class="text-base text-tertiary"><slot name="subtitle" /></span>
						{/if}
					</span>
					{#if hasDescriptionSlot}
						<span class="truncate text-sm text-tertiary">
							<slot name="description" />
						</span>
					{/if}
				</span>
			</span>

			<span class="flex items-center">
				<span class="flex flex-col text-right">
					{#if hasTitleEndSlot}
						<span class="text-lg font-bold">
							<slot name="title-end" />
						</span>
					{/if}
					{#if hasDescriptionEndSlot}
						<span class="text-sm text-tertiary">
							<slot name="description-end" />
						</span>
					{/if}
				</span>

				{#if hasActionSlot}
					<span in:fade class="ml-2 flex text-brand-primary"><slot name="action" /></span>
				{/if}
			</span>
		</span>
	</button>
</div>
