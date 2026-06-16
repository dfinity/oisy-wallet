<script lang="ts">
	import { IconCheck } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';
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
		titleStyleClass?: string;
		subtitleStyleClass?: string;
		testId?: string;
		logo?: Snippet;
		title?: Snippet;
		subtitle?: Snippet;
		titleEnd?: Snippet;
		description?: Snippet;
		descriptionEnd?: Snippet;
		action?: Snippet;
		onClick?: MouseEventHandler<HTMLButtonElement>;
		fullWidth?: boolean;
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
		onClick,
		fullWidth = false,
		titleStyleClass = '',
		subtitleStyleClass = ''
	}: Props = $props();
</script>

<div
	class={`flex ${styleClass ?? ''}`}
	class:hover:bg-brand-subtle-10={hover}
	class:rounded-lg={rounded}
	class:w-full={dividers || fullWidth}
>
	<button
		class="flex w-full border-0 px-2"
		class:cursor-default={isNullish(onClick)}
		data-tid={testId}
		onclick={onClick}
	>
		<span
			class="logo-button-wrapper flex w-full flex-row justify-between rounded-none border-t-0 border-r-0 border-l-0"
			class:border-b={dividers}
			class:border-brand-subtle-20={dividers}
			class:py-1={condensed}
			class:py-3={!condensed}
		>
			<span class="flex min-w-0 items-center">
				{#if selectable}
					<span class="text-brand-primary mr-2 flex min-w-4" in:fade>
						{#if selected}
							<IconCheck size="16px" />
						{/if}
					</span>
				{/if}
				{#if nonNullish(logo)}
					<span class="mr-2 flex">{@render logo()}</span>
				{/if}
				<span class="flex min-w-0 flex-col text-left">
					<span class="flex min-w-0 items-center truncate text-nowrap">
						{#if nonNullish(title)}
							<span
								class={`text-primary text-lg font-bold text-nowrap ${titleStyleClass}`}
								class:min-w-0={isNullish(subtitle)}
								class:truncate={isNullish(subtitle)}
							>
								{@render title()}
							</span>
						{/if}
						{#if nonNullish(subtitle)}
							{#if dividers}
								<span class="text-tertiary"><Divider /></span>
							{/if}
							<span class={`text-tertiary truncate text-base text-nowrap ${subtitleStyleClass}`}>
								{@render subtitle()}
							</span>
						{/if}
					</span>
					{#if nonNullish(description)}
						<span class="text-tertiary truncate text-sm">
							{@render description()}
						</span>
					{/if}
				</span>
			</span>

			<span class="flex items-center text-nowrap">
				<span class="flex flex-col text-right text-nowrap">
					{#if nonNullish(titleEnd)}
						<span class="text-lg font-bold text-nowrap">
							{@render titleEnd()}
						</span>
					{/if}
					{#if nonNullish(descriptionEnd)}
						<span class="text-tertiary text-sm text-nowrap">
							{@render descriptionEnd()}
						</span>
					{/if}
				</span>

				{#if nonNullish(action)}
					<span class="text-brand-primary ml-2 flex" in:fade>{@render action()}</span>
				{/if}
			</span>
		</span>
	</button>
</div>
