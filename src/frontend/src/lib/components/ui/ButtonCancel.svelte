<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		disabled?: boolean;
		fullWidth?: boolean;
		testId?: string;
		colorStyle?: string;
	}

	let { onclick, disabled = false, fullWidth = false, testId, colorStyle = 'secondary-light' }: Props = $props();
</script>

<Button
	{testId}
	{colorStyle}
	type="button"
	{fullWidth}
	{disabled}
	on:click={onclick}
>
	{$i18n.core.text.cancel}
</Button>
