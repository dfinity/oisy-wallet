<script lang="ts">
	import Copy from '$lib/components/ui/Copy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address } from '$lib/types/contact';

	let { address }: { address: Address } = $props();
</script>

<Copy text={$i18n.wallet.text.address_copied} value={address.address}></Copy>
