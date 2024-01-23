<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { icrcAccountIdentifierStore } from '$icp/derived/ic.derived';
</script>

<div>
	<label class="block text-sm font-semibold" for="ic-wallet-address">Wallet address:</label>

	<output id="ic-wallet-address" class="break-all"
		>{shortenWithMiddleEllipsis($icrcAccountIdentifierStore ?? '')}</output
	><Copy inline value={$icrcAccountIdentifierStore ?? ''} text="Address copied to clipboard." />

	<p class="pt-2 text-misty-rose break-normal">
		Note: For ICP deposits, use the 'Receive' button in your ICP account to get the right address.
	</p>
</div>
