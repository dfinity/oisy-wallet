<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ButtonColorStyle } from '$lib/types/style';

	interface Props {
		children: Snippet;
		onClick?: () => void;
		href: string;
		ariaLabel: string;
		colorStyle?: ButtonColorStyle;
	}

	let { children, onClick, href, ariaLabel, colorStyle = 'tertiary' }: Props = $props();
</script>

<a
	class={`as-button ${colorStyle} icon flex flex-col text-center text-xs font-normal`}
	aria-label={ariaLabel}
	{href}
	onclick={onClick}
	rel="external noopener noreferrer"
	target="_blank"
>
	{@render children()}
</a>
