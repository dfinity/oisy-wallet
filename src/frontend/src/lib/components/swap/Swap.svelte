<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import { get } from 'svelte/store';
	import {
		loadDisabledIcrcTokensBalances,
		loadDisabledIcrcTokensExchanges
	} from '$icp/services/icrc.services';
	import {
		IC_TOKEN_FEE_CONTEXT_KEY,
		type IcTokenFeeContext,
		icTokenFeeStore
	} from '$icp/stores/ic-token-fee.store';
	import SwapButtonWithModal from '$lib/components/swap/SwapButtonWithModal.svelte';
	import SwapModal from '$lib/components/swap/SwapModal.svelte';
	import { allDisabledKongSwapCompatibleIcrcTokens } from '$lib/derived/all-tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalSwap } from '$lib/derived/modal.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { loadKongSwapTokens } from '$lib/services/swap.services';
	import { busy } from '$lib/stores/busy.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		initSwapAmountsStore,
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';

	setContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY, {
		store: initSwapAmountsStore()
	});

	setContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY, {
		store: icTokenFeeStore
	});

	const onOpenSwap = async (tokenId: symbol) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		// We only wait for the required data to be loaded, other requests can be finished after the modal is open
		if (isNullish($kongSwapTokensStore)) {
			busy.start({ msg: get(i18n).init.info.hold_loading });

			await loadKongSwapTokens({
				identity: $authIdentity
			});

			busy.stop();
		}

		modalStore.openSwap(tokenId);

		await loadDisabledIcrcTokensBalances({
			identity: $authIdentity,
			disabledIcrcTokens: $allDisabledKongSwapCompatibleIcrcTokens
		});
		await loadDisabledIcrcTokensExchanges({
			disabledIcrcTokens: $allDisabledKongSwapCompatibleIcrcTokens
		});
	};
</script>

<SwapButtonWithModal open={onOpenSwap} isOpen={$modalSwap}>
	<SwapModal on:nnsClose />
</SwapButtonWithModal>
