<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import {
		APP_VERSION,
		GIT_BRANCH_NAME,
		GIT_COMMIT_HASH,
		TEST_FE
	} from '$lib/constants/app.constants';
	import { OISY_NAME, OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const version = `v${APP_VERSION}`;
	const releaseUrl = `${OISY_REPO_URL}/releases/tag/${version}`;

	const commit = GIT_COMMIT_HASH;
	const branch = GIT_BRANCH_NAME;
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
	<p class="mt-24 text-center text-xs text-primary">
		For development purpose, we show the branch and the commit only in test canisters.<br />
		<b>Branch:</b>{branch}<br />
		<b>Commit:</b>{commit}
	</p>
{/if}
