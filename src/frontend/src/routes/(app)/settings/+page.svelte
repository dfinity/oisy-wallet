<script lang="ts">
	import Settings from '$lib/components/settings/Settings.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<h2 class="mb-6 pb-1 text-base">{$i18n.settings.text.title}</h2>

<Settings />
