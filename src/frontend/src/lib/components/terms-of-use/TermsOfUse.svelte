<script lang="ts">
	import MarkdownWithSidebar from '$lib/components/ui/MarkdownWithSidebar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { getAgreementLastUpdated } from '$lib/utils/agreements.utils';
</script>

<MarkdownWithSidebar
	stringReplacements={{ $date: getAgreementLastUpdated({ type: 'termsOfUse', $i18n }) }}
	text={$i18n.terms_of_use.text.body}
	title={$i18n.terms_of_use.text.title}
/>
