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
		transparent?: boolean;
		onclick?: MouseEventHandler<HTMLButtonElement>;
		ondblclick?: MouseEventHandler<HTMLButtonElement>;
		children: Snippet;
		icon?: Snippet;
	}

	const {
		colorStyle = 'primary',
		type = 'submit',
		disabled,
		loading = false,
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
		children,
		icon = () => {}       
	}: Props = $props();
</script>

<button
	class={`${colorStyle} flex text-center justify-center gap-1 ${styleClass}`}
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
{@render children()}
<span class="shrink-0 [margin-left:clamp(0,0.25rem,0.5rem)]">{@render icon()}</span>
</button>

