<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import MarkdownWithSidebar from '$lib/components/ui/MarkdownWithSidebar.svelte';
</script>

<MarkdownWithSidebar
	title={$i18n.termsOfUse.text.title}
	text={$i18n.termsOfUse.text.body}
	stringReplacements={{ $date: 'todo' }}
/>
