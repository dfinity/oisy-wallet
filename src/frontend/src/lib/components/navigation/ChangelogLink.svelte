<script lang="ts">
	import IconChangelog from '$lib/components/icons/lucide/IconChangelog.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { TRACK_COUNT_OPEN_CHANGELOG } from '$lib/constants/analytics.contants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		asMenuItem?: boolean;
		asMenuItemCondensed?: boolean;
		trackEventSource?: string;
	}

	let { asMenuItem = false, asMenuItemCondensed = false, trackEventSource }: Props = $props();
</script>

<ExternalLink
	ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.changelog)}
	{asMenuItem}
	{asMenuItemCondensed}
	href="https://github.com/dfinity/oisy-wallet/releases"
	iconVisible={false}
	trackEvent={{
		name: TRACK_COUNT_OPEN_CHANGELOG,
		metadata: { source: trackEventSource ?? '' }
	}}
>
	<IconChangelog />
	{replaceOisyPlaceholders($i18n.navigation.text.changelog)}
</ExternalLink>
