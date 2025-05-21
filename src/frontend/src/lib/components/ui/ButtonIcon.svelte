<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';
	import type {Snippet} from "svelte";

	interface Props {
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

	let {icon, children, button = $bindable(), colorStyle = 'tertiary', testId, ariaLabel, disabled = false, link = true, styleClass = '', width = 'w-10'}: Props = $props();
</script>

<button
	class={`${colorStyle} icon flex h-10 flex-col text-center text-xs font-normal ${styleClass} ${width}`}
	class:link
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
>
	{@render icon()}
	<span class="visually-hidden">{@render children?.()}</span>
</button>
