<script lang="ts">
	import type { Snippet } from 'svelte';
	import { TRACK_OPEN_AGREEMENT } from '$lib/constants/analytics.constants';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		noUnderline?: boolean;
		testId?: string;
		icon?: Snippet;
		color?: 'blue' | 'inherit';
	}

	let { noUnderline = false, testId, icon, color = 'inherit' }: Props = $props();

	const handleClick = () => {
		trackEvent({
			name: TRACK_OPEN_AGREEMENT,
			metadata: { type: 'license-agreement', source: $authSignedIn ? 'app' : 'landing-page' }
		});
	};
</script>

<a
	class="inline-flex items-center gap-1"
	class:active:text-brand-primary-alt={color === 'inherit'}
	class:active:text-brand-secondary={color === 'blue'}
	class:hover:text-brand-primary-alt={color === 'inherit'}
	class:hover:text-brand-secondary={color === 'blue'}
	class:no-underline={noUnderline}
	class:text-brand-primary-alt={color === 'blue'}
	aria-label={replaceOisyPlaceholders($i18n.license_agreement.alt.license_agreement)}
	data-tid={testId}
	href="/license-agreement"
	onclick={handleClick}
	target="_blank"
>
	{$i18n.license_agreement.text.license_agreement}

	{@render icon?.()}
</a>
