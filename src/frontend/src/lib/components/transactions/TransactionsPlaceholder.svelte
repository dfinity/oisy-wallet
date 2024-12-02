<script lang="ts">
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import IconlyArrowRightLeft from '$lib/components/icons/iconly/IconlyArrowRightLeft.svelte';
	import IconlyArrowUpRight from '$lib/components/icons/iconly/IconlyArrowUpRight.svelte';
	import IconlyCreditCard from '$lib/components/icons/iconly/IconlyCreditCard.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="py-12" data-tid="no-transactions-placeholder">
	<div class="mb-5 flex justify-center p-2">
		<span class="-mr-3.5">
			<RoundedIcon icon={IconReceive} />
		</span>
		<span class="-mr-3.5">
			<RoundedIcon icon={IconlyArrowUpRight} />
		</span>
		<span class="-mr-3.5">
			<RoundedIcon icon={IconlyArrowRightLeft} />
		</span>
		<span class="transaction-action-icon">
			<RoundedIcon icon={IconlyCreditCard} />
		</span>
	</div>

	<div class="space-y-4">
		<p class="m-0 text-center text-lg font-bold">{$i18n.transactions.text.transaction_history}</p>
		<p class="m-0 text-center text-black opacity-50">
			{$i18n.transactions.text.buy_or_receive}
		</p>
	</div>
</div>
