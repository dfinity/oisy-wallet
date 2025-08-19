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
		ariaLabel={replaceOisyPlaceholders($i18n.settings.alt.github_release)}
		href={releaseUrl}
		iconVisible={false}>{version}</ExternalLink
	>
</p>

{#if TEST_FE && notEmptyString(branch) && notEmptyString(commit)}
	<p class="mt-24 text-center text-xs text-primary">
		{$i18n.settings.text.git_disclaimer}<br />
		<b>{$i18n.settings.text.git_branch_name}</b>
		{branch}<br />
		<b>{$i18n.settings.text.git_commit_hash}</b>
		{commit}
	</p>
{/if}
