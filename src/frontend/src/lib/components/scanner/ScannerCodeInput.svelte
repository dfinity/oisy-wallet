<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { isDesktop } from '$lib/utils/device.utils';

	interface Props {
		value: string;
		error?: string;
		label: string;
		placeholder: string;
		name: string;
		styleClass?: string;
		children?: Snippet;
	}

	let {
		value = $bindable(''),
		error,
		label,
		placeholder,
		name,
		styleClass = '',
		children
	}: Props = $props();

	let isError = $derived(notEmptyString(error));

	let borderColor = $derived(isError ? 'var(--color-border-error-solid)' : 'inherit');
</script>

<div class={`${styleClass} p-3`}>
	<span class="text-sm font-bold">{label}</span>

	<div style={`--input-custom-border-color: ${borderColor}`}>
		<InputTextWithAction {name} autofocus={isDesktop()} {placeholder} bind:value />

		{#if isError}
			<p class="text-md mb-0 pt-2 text-error-primary" transition:slide={SLIDE_DURATION}>
				{error}
			</p>
		{/if}
	</div>

	{#if nonNullish(children)}
		<div class="mt-3">
			{@render children()}
		</div>
	{/if}
</div>
