<script lang="ts">
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';

	export let href: string;
	export let ariaLabel: string;
	export let iconSize = '20';
	export let iconVisible = true;
	export let inline = false;
	export let color: 'blue' | 'inherit' = 'inherit';
</script>

<a
	{href}
	rel="external noopener noreferrer"
	target="_blank"
	class="inline-flex gap-2 items-center no-underline"
	aria-label={ariaLabel}
	style={`${inline ? 'vertical-align: sub;' : ''}`}
	class:text-blue={color === 'blue'}
	class:hover:text-dark-blue={color === 'blue'}
	class:active:text-dark-blue={color === 'blue'}
	class:hover:text-blue={color === 'inherit'}
	class:active:text-blue={color === 'inherit'}
>
	{#if iconVisible}
		<IconExternalLink size={iconSize} />
	{/if}
	<slot />
</a>
