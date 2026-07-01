<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
	import { LendBorrowProvider } from '$lib/types/lend-borrow';

	const { name } = lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM];
</script>

<span class="hidden sm:inline-block">
	<Badge styleClass="ml-2 mb-1" variant="transparent" width="w-fit">
		{name}
	</Badge>
</span>
