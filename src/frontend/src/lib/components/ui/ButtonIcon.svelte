<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';

	export let button: HTMLButtonElement | undefined = undefined;
	export let colorStyle: ButtonColorStyle = 'tertiary';
	export let testId: string | undefined = undefined;
	export let ariaLabel: string;
</script>

<button
	class={`${colorStyle} link icon flex flex-col text-center text-xs font-normal`}
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	data-tid={testId}
>
	<slot name="icon" />
	<span class="visually-hidden"><slot /></span>
</button>
