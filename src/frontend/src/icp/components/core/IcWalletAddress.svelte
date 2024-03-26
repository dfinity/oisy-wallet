<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div>
	<label class="block text-sm font-bold" for="ic-wallet-address">{$i18n.wallet.address}:</label>

	<output id="ic-wallet-address" class="break-all"
		>{shortenWithMiddleEllipsis($icrcAccountIdentifierText ?? '')}</output
	><Copy
		color="inherit"
		inline
		value={$icrcAccountIdentifierText ?? ''}
		text={$i18n.wallet.address_copied}
	/>

	<p class="pt-2 text-misty-rose break-normal">
		{$i18n.wallet.icp_deposits}
	</p>
</div>
