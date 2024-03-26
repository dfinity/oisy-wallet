<script lang="ts">
	import Settings from '$lib/components/pages/Settings.svelte';
    import {i18n} from "$lib/stores/i18n.store";
</script>

<h2 class="text-base mb-6 pb-1">{$i18n.settings.title}</h2>

<Settings />
