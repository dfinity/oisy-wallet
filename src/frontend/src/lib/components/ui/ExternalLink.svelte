<script lang="ts">
	import IconExternalLink from '$lib/components/icons/IconExternalLink.svelte';
	import Link from '$lib/components/ui/Link.svelte';

	export let href: string;
	export let ariaLabel: string;
	export let iconSize = '20';
	export let iconVisible = true;
	export let inline = false;
	export let color: 'blue' | 'inherit' = 'inherit';
	export let fullWidth = false;
</script>

<Link {href} {ariaLabel} {iconVisible} {inline} {color} {fullWidth} external>
	{#if iconVisible}
		<IconExternalLink size={iconSize} slot="icon" />
	{/if}
	<slot />
</Link>
