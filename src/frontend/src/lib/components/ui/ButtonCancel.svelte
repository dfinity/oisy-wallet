<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ButtonColorStyle } from '$lib/types/style';

	interface Props {
		onclick: () => void;
		disabled?: boolean;
		fullWidth?: boolean;
		testId?: string;
		colorStyle?: ButtonColorStyle;
	}

	let {
		onclick,
		disabled = false,
		fullWidth = false,
		testId,
		colorStyle = 'secondary-light'
	}: Props = $props();
</script>

<Button {testId} type="button" {colorStyle} {fullWidth} {disabled} on:click={onclick}>
	{$i18n.core.text.cancel}
</Button>
