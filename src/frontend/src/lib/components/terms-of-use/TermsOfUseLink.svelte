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
	aria-label={replaceOisyPlaceholders($i18n.terms_of_use.alt.terms_of_use)}
	data-tid={testId}
	href="/terms-of-use"
>
	{$i18n.terms_of_use.text.terms_of_use}
</a>
