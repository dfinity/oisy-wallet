<script lang="ts">
	import IconChangelog from '$lib/components/icons/lucide/IconChangelog.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let styleClass = '';
</script>

<ExternalLink
	href="https://github.com/dfinity/oisy-wallet/releases"
	ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.changelog)}
	iconVisible={false}
	styleClass={`nav-item ${styleClass}`}
>
	<IconChangelog />
	{replaceOisyPlaceholders($i18n.navigation.text.changelog)}
</ExternalLink>
