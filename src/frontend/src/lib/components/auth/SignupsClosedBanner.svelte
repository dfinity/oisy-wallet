<script lang="ts">
	import { AnonymousIdentity } from '@icp-sdk/core/agent';
	import { onMount } from 'svelte';
	import { newUserSignupsAllowed } from '$lib/api/backend.api';
	import InfoBanner from '$lib/components/ui/InfoBanner.svelte';
	import { SIGNUPS_CLOSED_BANNER_TEST_ID } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { consoleError } from '$lib/utils/console.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let signupsClosed = $state(false);

	onMount(async () => {
		try {
			const allowed = await newUserSignupsAllowed({
				identity: new AnonymousIdentity(),
				certified: false
			});
			signupsClosed = !allowed;
		} catch (err: unknown) {
			// Intentionally silent: if the query fails we simply do not show the banner.
			consoleError('Failed to query new_user_signups_allowed', err);
		}
	});
</script>

{#if signupsClosed}
	<div class="mb-4 flex w-full justify-center">
		<InfoBanner testId={SIGNUPS_CLOSED_BANNER_TEST_ID}>
			<span class="w-full px-2">
				{replaceOisyPlaceholders($i18n.auth.banner.signups_closed)}
			</span>
		</InfoBanner>
	</div>
{/if}
