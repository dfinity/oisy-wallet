<script lang="ts">
	import Header from '$lib/components/ui/Header.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<Header>
	{$i18n.transactions.text.title}
</Header>

<!-- TODO: Implement https://dfinity.atlassian.net/browse/GIX-2883 -->
