<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let noUnderline = false;
	export let testId: string | undefined = undefined;
</script>

<a
	href="/license-agreement"
	aria-label={replaceOisyPlaceholders($i18n.license_agreement.alt.license_agreement)}
	data-tid={testId}
	class:no-underline={noUnderline}
>
	{$i18n.license_agreement.text.accept_terms_link}
</a>
