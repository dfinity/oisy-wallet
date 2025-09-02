<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		checked?: boolean;
		agreementLink: Snippet;
		onChange: () => void;
		inputId: string;
		testId: string;
		isOutdated: boolean;
	}

	const { checked, agreementLink, onChange, inputId, testId, isOutdated }: Props = $props();
</script>

<span class="flex items-center break-normal">
	<Checkbox checked={checked ?? false} {inputId} {testId} on:nnsChange={onChange}>
		{#if isOutdated}
			{$i18n.agreements.text.i_have_accepted_updated}
		{:else}
			{$i18n.agreements.text.i_have_accepted}
		{/if}
		<span class="inline-block break-normal text-brand-primary">
			{@render agreementLink()}
		</span>
	</Checkbox>
</span>
