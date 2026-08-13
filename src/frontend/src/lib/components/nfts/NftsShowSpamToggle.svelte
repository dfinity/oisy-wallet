<script lang="ts">
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { showSpam } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';

	const checked = $derived($showSpam);
</script>

<Toggle ariaLabel={$i18n.nfts.text.show_spam} {checked} />
