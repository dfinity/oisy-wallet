<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';

	interface Props {
		value: string;
		error?: string;
		label: string;
		placeholder: string;
		name: string;
	}

	let { value = $bindable(''), error, label, placeholder, name }: Props = $props();

	let borderColor = $derived(error ? 'var(--color-border-error-solid)' : 'inherit');
</script>

<div>
	<p class="mt-2 mb-1 md:text-center">{label}</p>

	<div style={`--input-custom-border-color: ${borderColor}`}>
		<InputText {name} {placeholder} bind:value />

		{#if notEmptyString(error)}
			<p class="text-md mb-0 pt-2 text-error-primary" transition:slide={SLIDE_DURATION}>
				{error}
			</p>
		{/if}
	</div>
</div>
