<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { XRP_TRUST_LINE_TOKENS_ENABLED } from '$env/xrp-trust-line-tokens.env';
	import TokenModal from '$lib/components/tokens/TokenModal.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
	import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
	import {
		isTokenXrpTrustLine,
		isXrpTokenValueZero,
		xrpTrustLineIdentifier
	} from '$xrp/utils/xrp-trust-line.utils';

	interface Props {
		fromRoute?: NavigationTarget;
	}

	let { fromRoute }: Props = $props();

	// Removing a trust-line token deletes its line on the ledger, which only an exactly zero balance
	// allows — the ledger's own string, so dust below the wallet's decimals counts. At any other
	// balance the token can be hidden instead.
	const isDeletable = $derived.by(() => {
		const token = $pageToken;

		if (!XRP_TRUST_LINE_TOKENS_ENABLED || isNullish(token) || !isTokenXrpTrustLine(token)) {
			return false;
		}

		const native = $enabledXrpTokens.find(({ network: { id } }) => id === token.network.id);
		const identifier = xrpTrustLineIdentifier(token);
		const line = nonNullish(native)
			? ($xrpTrustLinesStore[native.id] ?? []).find(
					(held) => xrpTrustLineIdentifier(held) === identifier
				)
			: undefined;

		return nonNullish(line) && isXrpTokenValueZero(line.balance);
	});
</script>

<TokenModal {fromRoute} {isDeletable} token={$pageToken} />
