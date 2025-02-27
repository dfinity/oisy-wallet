<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';

	export let colorStyle: ButtonColorStyle = 'primary';
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
	export let loading = false;
	export let fullWidth = false;
	export let link = false;
	export let paddingSmall = false;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;
	export let styleClass = '';
</script>

<button
	class={`${colorStyle} flex flex-1 text-center ${styleClass}`}
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
		class:invisible={loading}
		aria-hidden={loading}
	>
		<slot />
	</span>
</button>
