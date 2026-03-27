<script lang="ts">
	import MarkdownWithSidebar from '$lib/components/ui/MarkdownWithSidebar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { getAgreementLastUpdated } from '$lib/utils/agreements.utils';
</script>

<MarkdownWithSidebar
	stringReplacements={{ $date: getAgreementLastUpdated({ type: 'privacyPolicy', $i18n }) }}
	text={$i18n.privacy_policy.text.body}
	title={$i18n.privacy_policy.text.title}
/>
