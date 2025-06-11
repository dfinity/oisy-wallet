<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		onclick?: () => void;
		href: string;
		ariaLabel: string;
		colorStyle?: ButtonColorStyle;
	}

	let {children, onclick, href, ariaLabel, colorStyle = 'tertiary'}: Props = $props();
</script>

<a
	{href}
	rel="external noopener noreferrer"
	target="_blank"
	class={`as-button ${colorStyle} icon flex flex-col text-center text-xs font-normal`}
	{onclick}
	aria-label={ariaLabel}
>
	{@render children?.()}
</a>
