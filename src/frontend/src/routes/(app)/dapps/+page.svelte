<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import DApps from '$lib/components/dapps/DApps.svelte';
</script>

<h2 class="mb-6 pb-1 text-base">{$i18n.dapps.text.title}</h2>

<DApps />
