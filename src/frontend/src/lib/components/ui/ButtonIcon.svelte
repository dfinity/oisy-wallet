<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';

	export let button: HTMLButtonElement | undefined = undefined;
	export let colorStyle: ButtonColorStyle = 'tertiary';
	export let testId: string | undefined = undefined;
	export let ariaLabel: string;
	export let disabled = false;
	export let link = true;
</script>

<button
	class={`${colorStyle} icon flex h-10 w-10 flex-col text-center text-xs font-normal`}
	class:link
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	data-tid={testId}
	{disabled}
>
	<slot name="icon" />
	<span class="visually-hidden"><slot /></span>
</button>
