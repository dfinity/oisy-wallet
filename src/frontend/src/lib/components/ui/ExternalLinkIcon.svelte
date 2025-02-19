<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';

	export let href: string;
	export let ariaLabel: string;
	export let colorStyle: ButtonColorStyle = 'tertiary';
</script>

<a
	{href}
	rel="external noopener noreferrer"
	target="_blank"
	class={`as-button ${colorStyle} icon flex flex-col text-center text-xs font-normal`}
	on:click
	aria-label={ariaLabel}
>
	<slot />
</a>
