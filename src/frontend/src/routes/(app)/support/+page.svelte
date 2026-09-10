<script lang="ts">
	import Support from '$lib/components/support/Support.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<PageTitle>{$i18n.support.text.title}</PageTitle>

<Support />
