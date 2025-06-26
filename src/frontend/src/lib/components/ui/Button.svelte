<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import type { ButtonColorStyle } from '$lib/types/style';

	interface Props {
		colorStyle?: ButtonColorStyle;
		type?: 'submit' | 'reset' | 'button';
		disabled?: boolean;
		loading?: boolean;
		loadingAsSkeleton?: boolean;
		fullWidth?: boolean;
		alignLeft?: boolean;
		link?: boolean;
		inlineLink?: boolean;
		paddingSmall?: boolean;
		testId?: string;
		ariaLabel?: string;
		styleClass?: string;
		transparent?: boolean;
		onclick?: MouseEventHandler<HTMLButtonElement>;
		ondblclick?: MouseEventHandler<HTMLButtonElement>;
		children: Snippet;
	}

	const {
		colorStyle = 'primary',
		type = 'submit',
		disabled,
		loading = false,
		loadingAsSkeleton = true,
		fullWidth = false,
		alignLeft = false,
		link = false,
		inlineLink = false,
		paddingSmall = false,
		testId,
		ariaLabel,
		styleClass = '',
		transparent,
		onclick,
		ondblclick,
		children
	}: Props = $props();
</script>

<button
	class={`${colorStyle} flex text-center ${styleClass}`}
	class:flex-1={!inlineLink}
	class:font-normal={inlineLink}
	class:text-tertiary={inlineLink}
	class:underline={inlineLink}
	class:hover:text-brand-primary={inlineLink}
	class:padding-sm={paddingSmall}
	class:w-full={fullWidth}
	class:link
	{type}
	class:justify-start={alignLeft}
	disabled={disabled ?? loading}
	class:loading
	class:transition={loading}
	class:duration-500={loading}
	class:ease-in-out={loading}
	class:animate-pulse={loading}
	class:transparent
	{onclick}
	{ondblclick}
	data-tid={testId}
	aria-label={ariaLabel}
>
	<span
		class="flex gap-2"
		class:transition={loading}
		class:duration-500={loading}
		class:ease-in-out={loading}
		class:invisible={loading && loadingAsSkeleton}
		aria-hidden={loading && loadingAsSkeleton}
	>
		{@render children()}
	</span>
</button>
