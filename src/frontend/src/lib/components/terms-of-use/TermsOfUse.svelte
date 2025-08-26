<script lang="ts">
	import MarkdownWithSidebar from '$lib/components/ui/MarkdownWithSidebar.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	// TODO: insert date from build env variable?
</script>

<MarkdownWithSidebar
	stringReplacements={{ $date: '26.08.2025' }}
	text={$i18n.termsOfUse.text.body}
	title={$i18n.termsOfUse.text.title}
/>
