<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { ALLOWANCE_REQUEST_COOLDOWN_MILLIS } from '$lib/constants/app.constants';
	import {
		ALLOWANCE_ISSUE_BANNER,
		ALLOWANCE_ISSUE_BANNER_RETRY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { requestAllowance } from '$lib/services/allowance-request.services';
	import { allowanceIssueStore } from '$lib/stores/allowance-issue.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let inCooldown = $state(false);
	let requesting = $state(false);

	$effect(() => {
		if (isNullish($allowanceIssueStore)) {
			inCooldown = false;
			return;
		}

		const remaining =
			$allowanceIssueStore.refusedAt + ALLOWANCE_REQUEST_COOLDOWN_MILLIS - Date.now();

		inCooldown = remaining > 0;

		if (!inCooldown) {
			return;
		}

		const timer = setTimeout(() => (inCooldown = false), remaining);

		return () => clearTimeout(timer);
	});

	const retry = async () => {
		requesting = true;

		try {
			await requestAllowance($authIdentity);
		} finally {
			requesting = false;
		}
	};
</script>

{#if nonNullish($allowanceIssueStore)}
	<div
		class="fixed top-6 left-[50%] z-10 flex min-w-80 -translate-x-[50%] justify-between gap-4 rounded-lg bg-primary"
	>
		<WarningBanner testId={ALLOWANCE_ISSUE_BANNER}>
			<span class="w-full px-2"
				>{replaceOisyPlaceholders($i18n.core.info.oisy_allowance_limited)}</span
			>
			<Button
				colorStyle="secondary-light"
				disabled={inCooldown || requesting}
				loading={requesting}
				onclick={retry}
				paddingSmall
				testId={ALLOWANCE_ISSUE_BANNER_RETRY_BUTTON}
				type="button">{$i18n.core.text.retry}</Button
			>
		</WarningBanner>
	</div>
{/if}
