<script lang="ts">
	import { IconCheck } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';

	export let selectable = false;
	export let selected = false;
	export let dividers = false;
	export let hover = true;
	export let rounded = true;
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

<div class:hover:bg-brand-subtle-10={hover} class:rounded-lg={rounded}>
	<button on:click class="flex w-full border-0 px-2" data-tid={testId}>
		<span
			class="flex w-full flex-row justify-between rounded-none border-l-0 border-r-0 border-t-0 py-3"
			class:border-brand-subtle-20={dividers}
			class:border-b={dividers}
		>
			<span class="flex items-center">
				<span class="mr-4"><slot name="logo" /></span>
				<span class="flex flex-col text-left">
					<span class="text-base">
						{#if hasTitleSlot}
							<span class="float-left font-bold"><slot name="title" /></span>
						{/if}
						{#if hasSubtitleSlot}
							{#if dividers}
								<span class="float-left text-tertiary"> &nbsp;&middot;&nbsp; </span>
							{/if}
							<span class="float-left text-tertiary"> <slot name="subtitle" /></span>
						{/if}
					</span>
					{#if hasDescriptionSlot}
						<span class="text-sm text-tertiary">
							<slot name="description" />
						</span>
					{/if}
				</span>
			</span>

			<span class="flex items-center">
				<span class="flex flex-col text-right">
					{#if hasTitleEndSlot}
						<span class="text-base font-bold">
							<slot name="title-end" />
						</span>
					{/if}
					{#if hasDescriptionEndSlot}
						<span class="text-sm text-tertiary">
							<slot name="description-end" />
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
