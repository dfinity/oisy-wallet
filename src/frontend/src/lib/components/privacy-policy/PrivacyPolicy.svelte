<script lang="ts">
	import MarkdownWithSidebar from '$lib/components/ui/MarkdownWithSidebar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<MarkdownWithSidebar
	stringReplacements={{ $date: '26.08.2025' }}
	text={$i18n.privacy_policy.text.body}
	title={$i18n.privacy_policy.text.title}
/>
