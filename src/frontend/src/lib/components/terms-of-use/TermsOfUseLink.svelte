<script lang="ts">
	import { TRACK_OPEN_AGREEMENT } from '$lib/constants/analytics.contants';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		noUnderline?: boolean;
		testId?: string;
	}

	let { noUnderline = false, testId }: Props = $props();

	const handleClick = () => {
		trackEvent({
			name: TRACK_OPEN_AGREEMENT,
			metadata: { type: 'terms-of-use', source: $authSignedIn ? 'app' : 'landing-page' }
		});
	};
</script>

<a
	class:no-underline={noUnderline}
	aria-label={replaceOisyPlaceholders($i18n.terms_of_use.alt.terms_of_use)}
	data-tid={testId}
	href="/terms-of-use"
	onclick={handleClick}
	target="_blank"
>
	{$i18n.terms_of_use.text.terms_of_use}
</a>
