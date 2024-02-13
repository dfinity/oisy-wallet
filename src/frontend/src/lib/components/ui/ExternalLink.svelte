<script lang="ts">
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';

	export let href: string;
	export let ariaLabel: string;
	export let iconSize = '20';
</script>

<a
	{href}
	rel="external noopener noreferrer"
	target="_blank"
	class="flex gap-2 items-center no-underline"
	aria-label={ariaLabel}
>
	<IconExternalLink size={iconSize} />
	<slot />
</a>
