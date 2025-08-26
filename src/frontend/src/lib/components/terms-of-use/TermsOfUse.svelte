<script lang="ts">
	import MarkdownWithSidebar from '$lib/components/ui/MarkdownWithSidebar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<MarkdownWithSidebar
	stringReplacements={{ $date: 'todo' }}
	text={$i18n.termsOfUse.text.body}
	title={$i18n.termsOfUse.text.title}
/>
