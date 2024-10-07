<script lang="ts">
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';

	export let href: string;
	export let ariaLabel: string;
	export let iconSize = '20';
	export let iconVisible = true;
	export let inline = false;
	export let color: 'blue' | 'inherit' = 'inherit';
	export let fullWidth = false;
</script>

<a
	{href}
	rel="external noopener noreferrer"
	target="_blank"
	class="inline-flex items-center gap-2 no-underline"
	aria-label={ariaLabel}
	style={`${inline ? 'vertical-align: sub;' : ''}`}
	class:text-primary={color === 'blue'}
	class:hover:text-inherit={color === 'blue'}
	class:active:text-inherit={color === 'blue'}
	class:w-full={fullWidth}
>
	{#if iconVisible}
		<IconExternalLink size={iconSize} />
	{/if}
	<slot />
</a>
