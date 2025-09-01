<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		checked?: boolean;
		agreementLink: Snippet;
		onChange: () => void;
		inputId: string;
		isOutdated: boolean;
	}

	const { checked, agreementLink, onChange, inputId, isOutdated }: Props = $props();
</script>

<span class="flex items-center gap-1">
	<Checkbox checked={checked ?? false} {inputId} preventDefault={true} on:nnsChange={onChange}>
		{#if isOutdated}
			{$i18n.agreements.text.i_have_accepted_updated}
		{:else}
			{$i18n.agreements.text.i_have_accepted}
		{/if}
	</Checkbox>
	<span class="flex items-center gap-1 text-brand-primary">
		{@render agreementLink()}
	</span>
</span>
