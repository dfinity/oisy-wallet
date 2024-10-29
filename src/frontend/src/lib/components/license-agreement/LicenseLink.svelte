<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';

	export let noUnderline = false;
</script>

<a
	href="/license-agreement"
	aria-label={replaceOisyPlaceholders($i18n.license_agreement.alt.license_agreement)}
	class:no-underline={noUnderline}
>
	{$i18n.license_agreement.text.accept_terms_link}
</a>
