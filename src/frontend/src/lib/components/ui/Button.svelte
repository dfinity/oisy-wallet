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
	class={`${colorStyle} flex flex-1 text-center transition duration-500 ease-in-out ${styleClass}`}
	class:padding-sm={paddingSmall}
	class:w-full={fullWidth}
	class:link
	{type}
	disabled={disabled || loading}
	class:loading
	class:animate-pulse={loading}
	class:opacity-40={loading}
	on:click
	data-tid={testId}
	aria-label={ariaLabel}
>
	<div class="transition duration-500 ease-in-out" class:invisible={loading} aria-hidden={loading}>
		<slot />
	</div>
</button>
