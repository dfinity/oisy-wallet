<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';

	export let colorStyle: ButtonColorStyle = 'primary';
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
	export let fullWidth = false;
	export let link = false;
	export let paddingSmall = false;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;
</script>

<button
	class={`${colorStyle} flex flex-1 text-center`}
	class:padding-sm={paddingSmall}
	class:w-full={fullWidth}
	class:link
	{type}
	{disabled}
	on:click
	data-tid={testId}
	aria-label={ariaLabel}
>
	<slot />
</button>
