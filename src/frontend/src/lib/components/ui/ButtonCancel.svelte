<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { MouseEventHandler } from 'svelte/elements';

	interface Props {
		onclick: MouseEventHandler<HTMLButtonElement>;
		disabled?: boolean;
		fullWidth?: boolean;
		testId?: string;
	}

	let { onclick, disabled = false, fullWidth = false, testId }: Props = $props();
</script>

<Button colorStyle="secondary-light" {disabled} {fullWidth} {onclick} {testId} type="button">
	{$i18n.core.text.cancel}
</Button>
