<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import {
		loadDisabledIcrcTokensBalances,
		loadDisabledIcrcTokensExchanges
	} from '$icp/services/icrc.services';
	import SwapButtonWithModal from '$lib/components/swap/SwapButtonWithModal.svelte';
	import SwapModal from '$lib/components/swap/SwapModal.svelte';
	import { allDisabledIcrcTokens } from '$lib/derived/all-tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalSwap } from '$lib/derived/modal.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		initSwapAmountsStore,
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';

	setContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY, {
		store: initSwapAmountsStore()
	});

	const onOpenSwap = async (tokenId: symbol) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		modalStore.openSwap(tokenId);

		await loadDisabledIcrcTokensBalances({
			identity: $authIdentity,
			disabledIcrcTokens: $allDisabledIcrcTokens
		});
		await loadDisabledIcrcTokensExchanges({
			disabledIcrcTokens: $allDisabledIcrcTokens
		});
	};
</script>

<SwapButtonWithModal open={onOpenSwap} isOpen={$modalSwap}>
	<SwapModal on:nnsClose />
</SwapButtonWithModal>
