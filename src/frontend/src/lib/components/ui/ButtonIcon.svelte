<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ButtonColorStyle } from '$lib/types/style';

	interface Props {
		onclick: () => void;
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
		width = 'w-10'
	}: Props = $props();
</script>

<button
	class={`${colorStyle} icon flex h-10 flex-col text-center text-xs font-normal ${styleClass} ${width}`}
	class:link
	bind:this={button}
	{onclick}
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
>
	{@render icon()}
	<span class="visually-hidden">{@render children?.()}</span>
</button>
