<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { transactionFee } from '$icp/api/icrc-ledger.api';
	import { IC_TOKEN_FEE_CONTEXT_KEY, type IcTokenFeeContext } from '$icp/stores/ic-token-fee.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';

	interface Props {
		token?: IcToken;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	const { store } = getContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY);

	const loadIcTokenFee = async () => {
		if (isNullish($authIdentity)) {
			store.reset();
			await nullishSignOut();
			return;
		}

		if (isNullish(token) || nonNullish($store?.[token.symbol])) {
			return;
		}

		try {
			store.setIcTokenFee({
				tokenSymbol: token.symbol,
				fee: await transactionFee({
					identity: $authIdentity,
					ledgerCanisterId: token.ledgerCanisterId
				})
			});
		} catch (_err: unknown) {
			// as a fallback, we use the icToken fee prop
			store.setIcTokenFee({
				tokenSymbol: token.symbol,
				fee: token.fee
			});
		}
	};

	const debounceLoadIcTokenFee = debounce(loadIcTokenFee);

	$effect(() => {
		[token];

		debounceLoadIcTokenFee();
	});
</script>

{@render children()}
