<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address } from '$lib/types/contact';

	let { address }: { address: Address } = $props();
</script>

{$i18n.address.types[address.address_type]}
