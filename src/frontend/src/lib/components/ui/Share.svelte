<script lang="ts">
	import IconShare from '$lib/components/icons/IconShare.svelte';

	export let text: string;
	export let href: string;
	export let color: 'blue' | 'inherit' = 'inherit';
	export let testId: string | undefined = undefined;
	export let styleClass: string | undefined = undefined;
</script>

<a
	{href}
	target="_blank"
	class:text-brand-primary={color === 'blue'}
	class:hover:text-inherit={color === 'blue'}
	class:active:text-inherit={color === 'blue'}
	class={`${styleClass ?? ''} gap-2 flex no-underline border border-grey rounded-xl px-3 py-2`}
	data-tid={testId}
>
	{text}
	<div class="mt-0.5">
		<IconShare />
	</div>
</a>
