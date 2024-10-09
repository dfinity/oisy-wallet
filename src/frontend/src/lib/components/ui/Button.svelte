<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';

	export let colorStyle: ButtonColorStyle = 'primary';
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
	export let fullWidth = false;
</script>

<button
	class={`${colorStyle} block flex-1 text-center`}
	class:w-full={fullWidth}
	{type}
	{disabled}
	on:click
>
	<slot />
</button>
