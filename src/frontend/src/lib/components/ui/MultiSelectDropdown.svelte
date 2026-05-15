<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { MULTI_SELECT_DROPDOWN_PANEL_SHELL } from '$lib/constants/test-ids.constants';

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
		panelWidthClass?: string;
		// Fires whenever the panel transitions from hidden→visible or
		// visible→hidden (including clicks outside that close the popover).
		// Optional so existing callers stay untouched.
		onToggle?: (visible: boolean) => void;
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
		panel,
		panelWidthClass,
		onToggle
	}: Props = $props();

	let visible = $state(false);
	let button = $state<HTMLButtonElement | undefined>();

	const onTriggerClick = () => {
		visible = !visible;
	};

	// Surface every visibility change (trigger click, click-outside, escape)
	// through the optional `onToggle` callback so consumers can react without
	// wiring up `bind:visible` themselves. We skip the very first run so we
	// don't fire a spurious "close" for the initial `visible = false`.
	let initialised = false;
	$effect(() => {
		const next = visible;
		if (!initialised) {
			initialised = true;
			return;
		}
		onToggle?.(next);
	});
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

<ResponsivePopover {button} direction="ltr" bind:visible>
	{#snippet content()}
		<div
			class="flex flex-col gap-2 p-1 {panelWidthClass ?? 'w-full min-w-60'}"
			data-tid={MULTI_SELECT_DROPDOWN_PANEL_SHELL}
		>
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
