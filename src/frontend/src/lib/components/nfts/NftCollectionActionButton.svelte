<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		icon: Snippet;
		onclick: MouseEventHandler<HTMLButtonElement>;
		label: string;
	}

	let { icon, onclick, label }: Props = $props();
</script>

<Button
	colorStyle="tertiary-alt"
	innerStyleClass="h-5"
	{onclick}
	paddingSmall
	styleClass="rounded-lg border-brand-subtle-30 p-2"
>
	<span class="flex items-center gap-1">
		{@render icon()}
		<span class="flex px-[2px] font-semibold">{label}</span>
	</span>
</Button>