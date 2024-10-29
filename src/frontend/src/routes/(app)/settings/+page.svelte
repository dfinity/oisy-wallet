<script lang="ts">
	import Settings from '$lib/components/settings/Settings.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
</script>

<PageTitle>{$i18n.settings.text.title}</PageTitle>

<Settings />
