<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { ButtonColorStyle } from '$lib/types/style';

	interface Props {
		onclick: MouseEventHandler<HTMLButtonElement>;
		icon: Snippet;
		children?: Snippet;
		button?: HTMLButtonElement;
		colorStyle?: ButtonColorStyle;
		testId?: string;
		ariaLabel: string;
		disabled?: boolean;
		loading?: boolean;
		link?: boolean;
		styleClass?: string;
		width?: 'w-6' | 'w-8' | 'w-10' | 'w-16';
		height?: 'h-6' | 'h-8' | 'h-10';
		transparent?: boolean;
	}

	let {
		onclick,
		icon,
		children,
		button = $bindable(),
		colorStyle = 'tertiary',
		testId,
		ariaLabel,
		disabled,
		loading = false, // renders with spinner
		link = true,
		styleClass = '',
		width = 'w-10',
		height = 'h-10',
		transparent = false
	}: Props = $props();
</script>

<button
	bind:this={button}
	class={`${colorStyle} icon flex flex-col text-center text-xs font-normal ${styleClass} ${width} ${height}`}
	class:animate-pulse={loading}
	class:cursor-not-allowed={loading || disabled}
	class:duration-500={loading}
	class:ease-in-out={loading}
	class:link
	class:loading
	class:transition={loading}
	class:transparent
	aria-label={ariaLabel}
	data-tid={testId}
	disabled={disabled ?? loading}
	{onclick}
	type="button"
>
	<span
		class="relative flex min-w-0 gap-2"
		class:duration-500={loading}
		class:ease-in-out={loading}
		class:transition={loading}
	>
		{#if loading}
			<span class="absolute flex h-full w-full items-center justify-center">
				<Spinner />
			</span>

			<span class="invisible">
				{@render icon()}
				<span class="visually-hidden">{@render children?.()}</span>
			</span>
		{:else}
			{@render icon()}
			<span class="visually-hidden">{@render children?.()}</span>
		{/if}
	</span>
</button>
