<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import NewSwapModal from './NewSwapModal.svelte';
	import { VELORA_SWAP_ENABLED } from '$env/velora-swap.env';
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
	import {
		allDisabledKongSwapCompatibleIcrcTokens,
		allIcrcTokens
	} from '$lib/derived/all-tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalSwap } from '$lib/derived/modal.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { loadKongSwapTokens as loadKongSwapTokensService } from '$lib/services/swap.services';
	import { busy } from '$lib/stores/busy.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		initSwapAmountsStore,
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { waitReady } from '$lib/utils/timeout.utils';

	setContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY, {
		store: initSwapAmountsStore()
	});

	setContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY, {
		store: icTokenFeeStore
	});

	const isDisabled = (): boolean => isNullish($kongSwapTokensStore) || isNullish($allIcrcTokens);

	const loadKongSwapTokens = async (): Promise<'ready' | undefined> => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (!isDisabled()) {
			return 'ready';
		}

		try {
			await loadKongSwapTokensService({
				identity: $authIdentity,
				allIcrcTokens: $allIcrcTokens
			});

			return 'ready';
		} catch (_err: unknown) {
			console.warn('Failed to load KongSwap tokens.');

			return undefined;
		}
	};

	const onOpenSwap = async (tokenId: symbol) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		busy.start({ msg: $i18n.init.info.hold_loading });

		// 1. If loadKongSwapTokens succeeds within 10s - show modal.
		// 2. If loadKongSwapTokens does not succeed within 10s - show toast, do not show modal.
		// 3. If loadKongSwapTokens throws - show toast, do not show modal.
		const kongSwapTokensStatus = await Promise.any([
			waitReady({ retries: 20, isDisabled }),
			loadKongSwapTokens()
		]);

		busy.stop();

		if (kongSwapTokensStatus !== 'ready') {
			toastsShow({
				text: $i18n.swap.error.kong_not_available,
				level: 'info',
				duration: 3000
			});

			return;
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

<SwapButtonWithModal isOpen={$modalSwap} onOpen={onOpenSwap}>
	{#if VELORA_SWAP_ENABLED}
		<NewSwapModal on:nnsClose />
	{:else}
		<SwapModal on:nnsClose />
	{/if}
</SwapButtonWithModal>
