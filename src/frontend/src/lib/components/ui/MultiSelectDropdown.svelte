<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';

	interface Props {
		triggerLabel: string;
		ariaLabel: string;
		count?: number;
		searchable?: boolean;
		searchPlaceholder?: string;
		searchValue?: string;
		testId?: string;
		triggerIcon?: Snippet;
		panel: Snippet;
	}

	let {
		triggerLabel,
		ariaLabel,
		count = 0,
		searchable = false,
		searchPlaceholder = '',
		searchValue = $bindable(''),
		testId,
		triggerIcon,
		panel
	}: Props = $props();

	let visible = $state(false);
	let button = $state<HTMLButtonElement | undefined>();

	const onTriggerClick = () => {
		visible = !visible;
	};
</script>

<button
	bind:this={button}
	class="dropdown-button h-[2.2rem] rounded-lg border border-solid border-primary hover:border-brand-primary"
	class:opened={visible}
	aria-label={ariaLabel}
	data-tid={testId}
	onclick={onTriggerClick}
	type="button"
>
	{#if nonNullish(triggerIcon)}
		<span class="flex items-center text-secondary">
			{@render triggerIcon()}
		</span>
	{/if}

	<span class="min-w-0 flex-1 truncate font-medium">{triggerLabel}</span>

	{#if count > 0}
		<Badge variant="info" width="w-fit">{count}</Badge>
	{/if}

	<IconExpandMore size="20" />
</button>

<ResponsivePopover {button} bind:visible>
	{#snippet content()}
		<div class="flex w-full min-w-60 flex-col gap-2 p-1">
			{#if searchable}
				<InputSearch
					autofocus
					placeholder={searchPlaceholder}
					showResetButton={searchValue.length > 0}
					bind:filter={searchValue}
				/>
			{/if}

			{@render panel()}
		</div>
	{/snippet}
</ResponsivePopover>
