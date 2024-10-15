<script lang="ts">
	import type { ButtonColorStyle } from '$lib/types/style';

	export let colorStyle: ButtonColorStyle = 'primary';
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
	export let disabled = false;
	export let fullWidth = false;
	export let link = false;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;
	export let styleClass = '';

	const buttonClasses = {
		xs: 'p-1 text-xs rounded-lg',
		sm: 'px-3 py-2 text-xs rounded-xl',
		md: 'px-4 py-3 text-xs rounded-2xl',
		lg: 'px-5 py-4 text-xs rounded-2xl',
		xl: 'p-5 text-base rounded-2xl'
	};
</script>

<button
	class={`${colorStyle} flex h-fit flex-1 text-center ${styleClass} ${buttonClasses[size]}`}
	class:w-full={fullWidth}
	class:link
	{type}
	{disabled}
	on:click
	data-tid={testId}
	aria-label={ariaLabel}
>
	<slot />
</button>
