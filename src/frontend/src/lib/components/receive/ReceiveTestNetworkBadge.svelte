<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<Badge variant="warning" width="w-fit">
	{$i18n.receive.token.text.test_network}
</Badge>
