<script lang="ts">
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import InfoBitcoin from '$icp/components/info/InfoBitcoin.svelte';

	let ckBTC = false;
	$: ckBTC = $tokenCkBtcLedger;
</script>

{#if ckBTC}
	<div class="border-2 border-dust bg-white rounded-lg mb-12 py-4 px-6">
		<InfoBitcoin />
	</div>
{/if}
