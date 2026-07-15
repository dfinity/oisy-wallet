<script lang="ts">
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<!-- Bitcoin tokens are not manageable. -->
<Toggle ariaLabel={$i18n.tokens.text.hide_token} checked disabled />
