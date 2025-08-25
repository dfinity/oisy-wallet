<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import type { ButtonColorStyle } from '$lib/types/style';

	interface Props {
		onclick: MouseEventHandler<HTMLButtonElement>;
		icon: Snippet;
		children?: Snippet;
		button?: HTMLButtonElement;
		colorStyle?: ButtonColorStyle;
		testId?: string;
		ariaLabel: string;
		disabled?: boolean;
		link?: boolean;
		styleClass?: string;
		width?: 'w-6' | 'w-8' | 'w-10';
		height?: 'h-6' | 'h-8' | 'h-10';
		transparent?: boolean;
	}

	let {
		onclick,
		icon,
		children,
		button = $bindable(),
		colorStyle = 'tertiary',
		testId,
		ariaLabel,
		disabled = false,
		link = true,
		styleClass = '',
		width = 'w-10',
		height = 'h-10',
		transparent = false
	}: Props = $props();
</script>

<button
	bind:this={button}
	class={`${colorStyle} icon flex flex-col text-center text-xs font-normal ${styleClass} ${width} ${height}`}
	class:link
	class:transparent
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
	{onclick}
	type="button"
>
	{@render icon()}
	<span class="visually-hidden">{@render children?.()}</span>
</button>
