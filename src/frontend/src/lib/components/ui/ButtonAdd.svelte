<script lang="ts">
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		testId?: string;
		fullWidth?: boolean;
		label?: string;
	}

	let { onclick, testId, fullWidth = true, label = $i18n.core.text.add }: Props = $props();
</script>

<Button
	colorStyle="secondary-light"
	on:click={onclick}
	{testId}
	{fullWidth}
	styleClass="h-full flex items-center justify-center gap-2 rounded-xl"
>
	<IconPlus />
	{label}
</Button>
