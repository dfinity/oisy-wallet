<script lang="ts">
	import PlugImport from '$lib/components/plug-import/PlugImport.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<PageTitle>{$i18n.plug_import.text.title}</PageTitle>

<PlugImport />
