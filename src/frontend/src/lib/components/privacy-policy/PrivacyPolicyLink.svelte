<script lang="ts">
	import type { Snippet } from 'svelte';
	import { TRACK_OPEN_AGREEMENT } from '$lib/constants/analytics.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { pathToHref } from '$lib/utils/nav.utils';

	interface Props {
		noUnderline?: boolean;
		testId?: string;
		icon?: Snippet;
	}

	let { noUnderline = false, testId, icon }: Props = $props();

	const handleClick = () => {
		trackEvent({
			name: TRACK_OPEN_AGREEMENT,
			metadata: { type: 'privacy-policy', source: $authSignedIn ? 'app' : 'landing-page' }
		});
	};
</script>

<a
	class="inline-flex items-center gap-1"
	class:no-underline={noUnderline}
	aria-label={replaceOisyPlaceholders($i18n.privacy_policy.alt.privacy_policy)}
	data-tid={testId}
	href={pathToHref(AppPath.PrivacyPolicy)}
	onclick={handleClick}
	target="_blank"
>
	{$i18n.privacy_policy.text.privacy_policy}

	{@render icon?.()}
</a>
