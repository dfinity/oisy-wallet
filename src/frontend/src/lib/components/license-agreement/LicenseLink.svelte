<script lang="ts">
	import type { Snippet } from 'svelte';
	import { TRACK_OPEN_AGREEMENT } from '$lib/constants/analytics.contants';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		noUnderline?: boolean;
		testId?: string;
		icon?: Snippet;
	}

	let { noUnderline = false, testId, icon }: Props = $props();

	const handleClick = () => {
		trackEvent({
			name: TRACK_OPEN_AGREEMENT,
			metadata: { type: 'license-agreement', source: $authSignedIn ? 'app' : 'landing-page' }
		});
	};
</script>

<a
	class="flex items-center gap-1"
	class:no-underline={noUnderline}
	aria-label={replaceOisyPlaceholders($i18n.license_agreement.alt.license_agreement)}
	data-tid={testId}
	href="/license-agreement"
	onclick={handleClick}
	target="_blank"
>
	{$i18n.license_agreement.text.license_agreement}

	{@render icon?.()}
</a>
