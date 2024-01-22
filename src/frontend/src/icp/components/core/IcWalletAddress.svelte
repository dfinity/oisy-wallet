<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import type { Principal } from '@dfinity/principal';
	import { authStore } from '$lib/stores/auth.store';

	let principal: Principal | undefined | null;
	$: principal = $authStore?.identity?.getPrincipal();
</script>

<div>
	<label class="block text-sm font-semibold" for="ic-wallet-address">Wallet address:</label>

	<output id="ic-wallet-address" class="break-all"
		>{shortenWithMiddleEllipsis(principal?.toText() ?? '')}</output
	><Copy inline value={principal?.toText() ?? ''} text="Address copied to clipboard." />

	<p class="pt-2 text-misty-rose">
		Note: For ICP deposits, use the 'Receive' button in your ICP account to get the right address.
	</p>
</div>
