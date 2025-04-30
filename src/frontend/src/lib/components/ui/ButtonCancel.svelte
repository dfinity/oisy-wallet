<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		disabled?: boolean;
		fullWidth?: boolean;
		testId?: string | undefined;
	}

	let { onclick, disabled = false, fullWidth = false, testId = undefined }: Props = $props();
</script>

<Button
	{testId}
	colorStyle="secondary-light"
	type="button"
	{fullWidth}
	{disabled}
	on:click={onclick}
>
	{$i18n.core.text.cancel}
</Button>
