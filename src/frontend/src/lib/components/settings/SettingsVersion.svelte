<script lang="ts">
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { APP_VERSION, TEST_FE } from '$lib/constants/app.constants';
	import { OISY_NAME, OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { notEmptyString } from '@dfinity/utils';

	const version = `v${APP_VERSION}`;
	const releaseUrl = `${OISY_REPO_URL}/releases/tag/${version}`;

	const commit = import.meta.env.__COMMIT_HASH__;
	const branch = import.meta.env.__BRANCH_NAME__;
</script>

<p class="mt-24 text-center text-xs text-primary">
	<span class="opacity-50">{OISY_NAME}</span>
	<ExternalLink
		href={releaseUrl}
		ariaLabel={replaceOisyPlaceholders($i18n.settings.alt.github_release)}
		iconVisible={false}>{version}</ExternalLink
	>
</p>

{#if TEST_FE && notEmptyString(branch) && notEmptyString(commit)}
	<small>For development purposes, we show the branch and the commit only in test canister.</small><br />
	<small>Branch: {branch}</small><br />
	<small>Commit: {commit}</small>
{/if}
