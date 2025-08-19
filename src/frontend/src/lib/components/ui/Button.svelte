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
		contentFullWidth?: boolean;
		alignLeft?: boolean;
		link?: boolean;
		inlineLink?: boolean;
		paddingSmall?: boolean;
		testId?: string;
		ariaLabel?: string;
		styleClass?: string;
		innerStyleClass?: string;
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
		contentFullWidth = false,
		alignLeft = false,
		link = false,
		inlineLink = false,
		paddingSmall = false,
		testId,
		ariaLabel,
		styleClass = '',
		innerStyleClass = '',
		transparent,
		onclick,
		ondblclick,
		children
	}: Props = $props();
</script>

<button
	class={`${colorStyle} flex text-center ${styleClass}`}
	class:animate-pulse={loading}
	class:duration-500={loading}
	class:ease-in-out={loading}
	class:flex-1={!inlineLink}
	class:font-normal={inlineLink}
	class:hover:text-brand-primary={inlineLink}
	class:justify-start={alignLeft}
	class:link
	class:loading
	class:padding-sm={paddingSmall}
	class:text-tertiary={inlineLink}
	class:transition={loading}
	class:transparent
	class:underline={inlineLink}
	class:w-full={fullWidth}
	aria-label={ariaLabel}
	data-tid={testId}
	disabled={disabled ?? loading}
	{onclick}
	{ondblclick}
	{type}
>
	<span
		class={`flex min-w-0 gap-2 ${innerStyleClass}`}
		class:duration-500={loading}
		class:ease-in-out={loading}
		class:invisible={loading && loadingAsSkeleton}
		class:transition={loading}
		class:w-full={contentFullWidth}
		aria-hidden={loading && loadingAsSkeleton}
	>
		{@render children()}
	</span>
</button>
