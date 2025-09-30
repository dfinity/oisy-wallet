<script lang="ts">
	import MarkdownWithSidebar from '$lib/components/ui/MarkdownWithSidebar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<MarkdownWithSidebar
	stringReplacements={{ $date: 'todo' }}
	text={replaceOisyPlaceholders($i18n.license_agreement.text.body)}
	title={replaceOisyPlaceholders($i18n.license_agreement.text.title)}
/>
