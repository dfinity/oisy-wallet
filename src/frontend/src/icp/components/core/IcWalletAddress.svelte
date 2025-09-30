<script lang="ts">
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
</script>

<div class="p-3">
	<label class="block text-sm font-bold" for="ic-wallet-address"
		>{$i18n.wallet.text.wallet_address}:</label
	>

	<output id="ic-wallet-address" class="break-all"
		>{shortenWithMiddleEllipsis({ text: $icrcAccountIdentifierText ?? '' })}</output
	><Copy inline text={$i18n.wallet.text.address_copied} value={$icrcAccountIdentifierText ?? ''} />

	<p class="break-normal pt-2 text-tertiary">
		{$i18n.wallet.text.icp_deposits}
	</p>
</div>
