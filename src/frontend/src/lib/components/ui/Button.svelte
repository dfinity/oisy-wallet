<script lang="ts">
	import type { PaddingSize } from '$lib/types/components';
	import type { ButtonColorStyle } from '$lib/types/style';

	export let colorStyle: ButtonColorStyle = 'primary';
	export let type: 'submit' | 'reset' | 'button' = 'submit';
	export let disabled = false;
	export let fullWidth = false;
	export let link = false;
	export let padding: PaddingSize = 'lg';
	export let testId: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;
	export let styleClass = '';

	const paddings: Record<PaddingSize, string> = {
		xs: 'p-1',
		sm: 'px-3 py-2',
		md: 'px-4 py-3',
		lg: 'px-5 py-4',
		xl: 'p-5',
		none: 'p-0'
	};
	let paddingStyle = paddings[padding];
</script>

<button
	class={`${colorStyle} flex flex-1 text-center ${paddingStyle} ${styleClass}`}
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
