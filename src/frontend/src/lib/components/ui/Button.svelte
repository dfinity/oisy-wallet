<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';
	import type {Snippet} from "svelte";

	interface Props {
		onclick: () => void;
		colorStyle: ButtonColorStyle;
		type: 'submit' | 'reset' | 'button';
		disabled: boolean;
		loading: boolean;
		loadingAsSkeleton: true;
		fullWidth: boolean;
		link: boolean;
		inlineLink: boolean;
		paddingSmall: boolean;
		testId: string | undefined;
		ariaLabel: string | undefined;
		styleClass: string;
		children: Snippet;
	}

	let {onclick, colorStyle = 'primary', type = 'submit', disabled = false, loading = false, loadingAsSkeleton = false,
	fullWidth = false, link = false, inlineLink = false, paddingSmall = false, testId = undefined, ariaLabel = undefined, styleClass = '', children}: Props = $props();
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
	disabled={disabled || loading}
	class:loading
	class:transition={loading}
	class:duration-500={loading}
	class:ease-in-out={loading}
	class:animate-pulse={loading}
	{onclick}
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
