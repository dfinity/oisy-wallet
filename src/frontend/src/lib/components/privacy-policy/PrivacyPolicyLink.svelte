<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { trackEvent } from '$lib/services/analytics.services';
	import { TRACK_OPEN_AGREEMENT } from '$lib/constants/analytics.contants';
	import { authSignedIn } from '$lib/derived/auth.derived';

	interface Props {
		noUnderline?: boolean;
		testId?: string;
	}

	let { noUnderline = false, testId }: Props = $props();

	const handleClick = () => {
		trackEvent({
			name: TRACK_OPEN_AGREEMENT,
			metadata: { type: 'privacy-policy', source: $authSignedIn ? 'app' : 'landing-page' }
		});
	};
</script>

<a
	class:no-underline={noUnderline}
	aria-label={replaceOisyPlaceholders($i18n.privacy_policy.alt.privacy_policy)}
	data-tid={testId}
	href="/privacy-policy"
	target="_blank"
	onclick={handleClick}
>
	{$i18n.privacy_policy.text.privacy_policy}
</a>
