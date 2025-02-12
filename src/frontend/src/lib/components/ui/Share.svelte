<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconShare from '$lib/components/icons/IconShare.svelte';

	export let text: string;
	export let href: string;
	export let color: 'blue' | 'inherit' = 'blue';
	export let testId: string | undefined = undefined;
	export let className: string | undefined = undefined;
</script>

<a
	{href}
	target="_blank"
	class:text-brand-primary={color === 'blue'}
	class:hover:text-inherit={color === 'blue'}
	class:active:text-inherit={color === 'blue'}
	class={nonNullish(className) ? `${className} gap-2 flex no-underline` : 'gap-2 flex no-underline'}
	data-tid={testId}
>
	{text}
	<div class="mt-0.5">
		<IconShare />
	</div>
</a>
