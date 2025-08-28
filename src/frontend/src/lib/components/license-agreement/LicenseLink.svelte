<script lang="ts">
	import { NEW_AGREEMENTS_ENABLED } from '$env/agreements.env';
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
			metadata: { type: 'licence-agreement', source: authSignedIn ? 'app' : 'landing-page' }
		});
	};
</script>

<a
	class:no-underline={noUnderline}
	aria-label={replaceOisyPlaceholders($i18n.license_agreement.alt.license_agreement)}
	data-tid={testId}
	href="/license-agreement"
	target={NEW_AGREEMENTS_ENABLED ? '_blank' : undefined}
	onclick={NEW_AGREEMENTS_ENABLED ? handleClick : undefined}
>
	{#if NEW_AGREEMENTS_ENABLED}
		{$i18n.license_agreement.text.license_agreement}
	{:else}
		{$i18n.license_agreement.text.accept_terms_link}
	{/if}
</a>
