<script lang="ts">
	import Settings from '$lib/components/settings/Settings.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<PageTitle>{$i18n.settings.text.title}</PageTitle>

<Settings />
