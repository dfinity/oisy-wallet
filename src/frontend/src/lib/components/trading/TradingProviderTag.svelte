<script lang="ts">
	import ProviderTag from '$lib/components/ui/ProviderTag.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<ProviderTag name={$i18n.trading.text.provider_name} />
