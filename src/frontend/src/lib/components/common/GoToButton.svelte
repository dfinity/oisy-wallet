<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements';
	import IconArrowRight from '$lib/components/icons/IconArrowRight.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		label: string;
		testId: string;
		onclick: MouseEventHandler<HTMLButtonElement>;
	}

	let { label, testId, onclick }: Props = $props();
</script>

<Button
	colorStyle="success"
	{onclick}
	styleClass="gap-1 flex-none px-12 font-semibold"
	{testId}
	type="button"
>
	{label}
	<IconArrowRight />
</Button>
