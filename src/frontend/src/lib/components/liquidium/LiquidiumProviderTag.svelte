<script lang="ts">
	import ProviderTag from '$lib/components/ui/ProviderTag.svelte';
	import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
	import { LendBorrowProvider } from '$lib/types/lend-borrow';

	const { name } = lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM];
</script>

<span class="hidden sm:inline-block">
	<ProviderTag {name} styleClass="ml-2 mb-1" />
</span>
