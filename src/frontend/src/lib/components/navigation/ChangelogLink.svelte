<script lang="ts">
	import IconChangelog from '$lib/components/icons/lucide/IconChangelog.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		asMenuItem?: boolean;
		asMenuItemCondensed?: boolean;
	}

	let { asMenuItem = false, asMenuItemCondensed = false }: Props = $props();
</script>

<ExternalLink
	{asMenuItem}
	{asMenuItemCondensed}
	href="https://github.com/dfinity/oisy-wallet/releases"
	ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.changelog)}
	iconVisible={false}
>
	<IconChangelog />
	{replaceOisyPlaceholders($i18n.navigation.text.changelog)}
</ExternalLink>
