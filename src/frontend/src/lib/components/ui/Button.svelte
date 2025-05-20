<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';

	export let colorStyle: ButtonColorStyle = 'primary';
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
	export let loading = false;
	export let loadingAsSkeleton = true;
	export let fullWidth = false;
	export let link = false;
	export let inlineLink = false;
	export let paddingSmall = false;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;
	export let styleClass = '';
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
	on:click
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
		<slot />
	</span>
</button>
