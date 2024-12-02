<script lang="ts">
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { APP_VERSION } from '$lib/constants/app.constants';
	import { OISY_NAME, OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const version = `v${APP_VERSION}`;
	const releaseUrl = `${OISY_REPO_URL}/releases/tag/${version}`;
</script>

<p class="mt-24 text-center text-xs text-black opacity-50">
	{OISY_NAME}
	<ExternalLink
		href={releaseUrl}
		ariaLabel={replaceOisyPlaceholders($i18n.settings.alt.github_release)}
		iconVisible={false}>{version}</ExternalLink
	>
</p>
