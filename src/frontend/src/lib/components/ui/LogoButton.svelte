<script lang="ts">
	import { IconCheck } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import Divider from '$lib/components/common/Divider.svelte';

	interface Props {
		selectable?: boolean;
		selected?: boolean;
		dividers?: boolean;
		hover?: boolean;
		rounded?: boolean;
		condensed?: boolean;
		styleClass?: string;
		testId?: string;
		logo: Snippet;
		title?: Snippet;
		subtitle?: Snippet;
		titleEnd?: Snippet;
		description?: Snippet;
		descriptionEnd?: Snippet;
		action?: Snippet;
		onClick?: () => void;
	}

	let {
		selectable = false,
		selected = false,
		dividers = false,
		hover = true,
		rounded = true,
		condensed = false,
		styleClass,
		testId,
		logo,
		title,
		subtitle,
		titleEnd,
		description,
		descriptionEnd,
		action,
		onClick
	}: Props = $props();
</script>

<div
	class={`flex ${styleClass ?? ''}`}
	class:w-full={dividers}
	class:hover:bg-brand-subtle-10={hover}
	class:rounded-lg={rounded}
>
	<button onclick={onClick} class="flex w-full border-0 px-2" data-tid={testId}>
		<span
			class="logo-button-wrapper flex w-full flex-row justify-between rounded-none border-l-0 border-r-0"
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
				<span class="mr-2 flex">{@render logo()}</span>
				<span class="flex min-w-0 flex-col text-left">
					<span class="truncate text-nowrap">
						{#if nonNullish(title)}
							<span class="text-lg font-bold text-primary">{@render title()}</span>
						{/if}
						{#if nonNullish(subtitle)}
							{#if dividers}
								<span class="text-tertiary"><Divider /></span>
							{/if}
							<span class="text-base text-tertiary">{@render subtitle()}</span>
						{/if}
					</span>
					{#if nonNullish(description)}
						<span class="truncate text-sm text-tertiary">
							{@render description()}
						</span>
					{/if}
				</span>
			</span>

			<span class="flex items-center">
				<span class="flex flex-col text-right">
					{#if nonNullish(titleEnd)}
						<span class="text-lg font-bold">
							{@render titleEnd()}
						</span>
					{/if}
					{#if nonNullish(descriptionEnd)}
						<span class="text-sm text-tertiary">
							{@render descriptionEnd()}
						</span>
					{/if}
				</span>

				{#if nonNullish(action)}
					<span in:fade class="ml-2 flex text-brand-primary">{@render action()}</span>
				{/if}
			</span>
		</span>
	</button>
</div>
