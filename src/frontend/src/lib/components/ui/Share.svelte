<script lang="ts">
	import IconShare from '$lib/components/icons/lucide/IconShare.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import type { TrackEventParams } from '$lib/types/analytics';

	interface Props {
		text: string;
		href: string;
		styleClass?: string;
		testId?: string;
		trackEvent?: TrackEventParams;
	}

	let { text, href, styleClass, testId, trackEvent }: Props = $props();
</script>

<ExternalLink
	{href}
	{testId}
	{trackEvent}
	ariaLabel={text}
	iconVisible={false}
	asButton
	styleClass={`${styleClass ?? ''} border border-disabled rounded-xl px-3 py-2 tertiary`}
>
	{text}
	<IconShare />
</ExternalLink>
