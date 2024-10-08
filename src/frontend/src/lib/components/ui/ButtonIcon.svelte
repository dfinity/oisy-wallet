<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';

	export let button: HTMLButtonElement | undefined = undefined;
	export let colorStyle: ButtonColorStyle = 'tertiary';
	export let link = false;
	export let iconSize: 'xs' | 'sm' | 'md' | 'lg' = 'sm';
	export let testId: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;
</script>

<button
	class={`${colorStyle} ${link ? 'link' : ''} icon flex flex-col text-center text-xs font-normal`}
	class:p-1={iconSize === 'xs'}
	class:p-2={iconSize === 'sm'}
	class:p-3={iconSize === 'md'}
	class:p-4={iconSize === 'lg'}
	class:rounded-lg={iconSize === 'xs'}
	class:rounded-xl={iconSize === 'sm' || iconSize === 'md'}
	class:rounded-2xl={iconSize === 'lg'}
	bind:this={button}
	on:click
	aria-label={ariaLabel}
	data-tid={testId}
>
	<slot name="icon" />
	<span class="visually-hidden"><slot /></span>
</button>
