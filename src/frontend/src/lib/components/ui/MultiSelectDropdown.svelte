<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { untrack, type Snippet } from 'svelte';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import ResponsivePopover from '$lib/components/ui/ResponsivePopover.svelte';
	import { MULTI_SELECT_DROPDOWN_PANEL_SHELL } from '$lib/constants/test-ids.constants';

	interface Props {
		// Names the trigger. Extra context goes in ariaDescription, not a label that would replace the
		// visible text voice-control users say to reach it (WCAG 2.5.3).
		triggerLabel: string;
		ariaDescription: string;
		count?: number;
		searchable?: boolean;
		searchPlaceholder?: string;
		searchValue?: string;
		testId?: string;
		triggerIcon?: Snippet;
		panel: Snippet;
		panelWidthClass?: string;
		onToggle?: (visible: boolean) => void;
	}

	let {
		triggerLabel,
		ariaDescription,
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

	const descriptionId = $props.id();

	let visible = $state(false);
	let button = $state<HTMLButtonElement | undefined>();

	const onTriggerClick = () => {
		visible = !visible;
	};

	let initialised = false;

	$effect(() => {
		const next = visible;

		if (!initialised) {
			initialised = true;

			return;
		}

		untrack(() => onToggle?.(next));
	});
</script>

<button
	bind:this={button}
	class="dropdown-button border"
	class:opened={visible}
	aria-describedby={descriptionId}
	aria-expanded={visible}
	data-tid={testId}
	onclick={onTriggerClick}
	type="button"
>
	{#if nonNullish(triggerIcon)}
		<span class="flex items-center text-secondary">
			{@render triggerIcon()}
		</span>
	{/if}

	<span class="min-w-0 flex-1 truncate">{triggerLabel}</span>

	{#if count > 0}
		<Badge variant="info" width="w-fit">{count}</Badge>
	{/if}

	<span class="dropdown-chevron" aria-hidden="true">
		<IconExpandMore />
	</span>

	<!-- hidden keeps it out of the button's name; aria-describedby still reads it. -->
	<span id={descriptionId} hidden>{ariaDescription}</span>
</button>

<ResponsivePopover ariaLabel={ariaDescription} {button} direction="ltr" dropdown bind:visible>
	{#snippet content()}
		<div
			class="flex flex-col gap-2 {panelWidthClass ?? 'w-full min-w-60'}"
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
