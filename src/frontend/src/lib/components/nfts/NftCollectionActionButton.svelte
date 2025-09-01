<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import Button from '$lib/components/ui/Button.svelte';
	import type { ButtonColorStyle } from '$lib/types/style';

	interface Props {
		icon: Snippet;
		onclick: MouseEventHandler<HTMLButtonElement>;
		label: string;
		colorStyle?: ButtonColorStyle;
	}

	let { icon, onclick, label, colorStyle = 'tertiary-alt' }: Props = $props();
</script>

<Button
	{colorStyle}
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
