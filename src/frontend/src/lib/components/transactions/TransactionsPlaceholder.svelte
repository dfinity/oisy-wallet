<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import IconlyArrowRightLeft from '$lib/components/icons/iconly/IconlyArrowRightLeft.svelte';
	import IconlyArrowUpRight from '$lib/components/icons/iconly/IconlyArrowUpRight.svelte';
	import IconlyCreditCard from '$lib/components/icons/iconly/IconlyCreditCard.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="py-12">
	<div class="mb-5 flex justify-center p-2">
		<span class="transaction-action-icon -mr-3.5">
			<IconReceive />
		</span>
		<span class="transaction-action-icon -mr-3.5">
			<IconlyArrowUpRight />
		</span>
		<span class="transaction-action-icon -mr-3.5">
			<IconlyArrowRightLeft />
		</span>
		<span class="transaction-action-icon">
			<IconlyCreditCard />
		</span>
	</div>

	<div class="space-y-4">
		<p class="m-0 text-center text-lg font-bold">{$i18n.transactions.text.transaction_history}</p>
		<p class="text-secondary m-0 text-center opacity-50">
			{$i18n.transactions.text.buy_or_receive}
		</p>
	</div>
</div>

<style lang="postcss">
	.transaction-action-icon {
		@apply flex items-center justify-center rounded-full bg-brand-subtle-alt p-3.5 ring-2 ring-brand-subtle;
	}
</style>
