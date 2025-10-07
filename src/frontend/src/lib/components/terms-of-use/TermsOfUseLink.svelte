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
			metadata: { type: 'terms-of-use', source: $authSignedIn ? 'app' : 'landing-page' }
		});
	};
</script>

<a
	class="inline-flex items-center gap-1"
	class:no-underline={noUnderline}
	aria-label={replaceOisyPlaceholders($i18n.terms_of_use.alt.terms_of_use)}
	data-tid={testId}
	href={pathToHref(AppPath.TermsOfUse)}
	onclick={handleClick}
	target="_blank"
>
	{$i18n.terms_of_use.text.terms_of_use}

	{@render icon?.()}
</a>
