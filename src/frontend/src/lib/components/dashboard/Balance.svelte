<script lang="ts">
	import { Utils } from 'alchemy-sdk';
	import { balanceStore } from '$lib/stores/balance.store';
</script>

<p>
	Balance: <output
		>{Utils.formatEther(`${$balanceStore ?? 0n}`)} ({`${$balanceStore ?? 0n}`})</output
	>
</p>
