<script lang="ts">
	import Help from '$lib/components/help/Help.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<PageTitle>{$i18n.help.text.title}</PageTitle>

<Help />
