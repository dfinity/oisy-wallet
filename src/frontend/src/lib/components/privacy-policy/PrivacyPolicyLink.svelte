<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		noUnderline?: boolean;
		testId?: string;
	}

	let { noUnderline = false, testId }: Props = $props();
</script>

<a
	class:no-underline={noUnderline}
	aria-label={replaceOisyPlaceholders($i18n.privacy_policy.alt.privacy_policy)}
	data-tid={testId}
	href="/privacy-policy"
>
	{$i18n.privacy_policy.text.privacy_policy}
</a>
