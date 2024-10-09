<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';

	export let colorStyle: ButtonColorStyle = 'primary';
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
	export let fullWidth = false;
	export let shrinkOnSmallScreens = false;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;
</script>

<button
	data-tid={testId}
	aria-label={ariaLabel}
	class={`${colorStyle} flex flex-1 text-center md:flex-row`}
	class:flex-col={shrinkOnSmallScreens}
	class:w-full={fullWidth}
	{type}
	{disabled}
	on:click
>
	<slot />
</button>
