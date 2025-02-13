<script lang="ts">
	import IconShare from '$lib/components/icons/lucide/IconShare.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';

	export let text: string;
	export let href: string;
	export let styleClass: string | undefined = undefined;
	export let testId: string | undefined = undefined;
</script>

<ExternalLink
	{href}
	{testId}
	ariaLabel={text}
	iconVisible={false}
	styleClass={`${styleClass ?? ''} border border-grey rounded-xl px-3 py-2`}
>
	{text}
	<IconShare />
</ExternalLink>
