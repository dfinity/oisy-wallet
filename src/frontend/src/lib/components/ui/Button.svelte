<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { ButtonColorStyle } from '$lib/types/style';

	interface Props {
		colorStyle?: ButtonColorStyle;
		type?: 'submit' | 'reset' | 'button';
		disabled?: boolean;
		loading?: boolean;
		initialising?: boolean;
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
		loading = false, // renders with spinner
		initialising = false, // renders as skeleton
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
	class:animate-pulse={loading || initialising}
	class:cursor-not-allowed={loading || initialising || disabled}
	class:duration-500={loading || initialising}
	class:ease-in-out={loading || initialising}
	class:flex-1={!inlineLink}
	class:font-normal={inlineLink}
	class:hover:text-brand-primary={inlineLink}
	class:justify-start={alignLeft}
	class:link
	class:loading={loading || initialising}
	class:padding-sm={paddingSmall}
	class:text-tertiary={inlineLink}
	class:transition={loading || initialising}
	class:transparent
	class:underline={inlineLink}
	class:w-full={fullWidth}
	aria-label={ariaLabel}
	data-tid={testId}
	disabled={disabled ?? (loading || initialising)}
	{onclick}
	{ondblclick}
	{type}
>
	<span
		class={`relative flex min-w-0 gap-2 ${innerStyleClass}`}
		class:duration-500={loading || initialising}
		class:ease-in-out={loading || initialising}
		class:invisible={initialising}
		class:transition={loading || initialising}
		class:w-full={contentFullWidth}
		aria-hidden={initialising}
	>
		{#if loading}
			<span class="absolute flex h-full w-full items-center justify-center">
				<Spinner />
			</span>

			<span class="invisible">
				{@render children()}
			</span>
		{:else}
			{@render children()}
		{/if}
	</span>
</button>
