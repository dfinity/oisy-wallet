<script lang="ts">
	import Tools from '$lib/components/tools/Tools.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<PageTitle>{$i18n.tools.text.title}</PageTitle>

<Tools />
