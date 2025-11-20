<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import {
		loadDisabledIcrcTokensBalances,
		loadDisabledIcrcTokensExchanges
	} from '$icp/services/icrc.services';
	import { allIcrcTokens } from '$lib/derived/all-tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadKongSwapTokens as loadKongSwapTokensService } from '$lib/services/swap.services';
	import { busy } from '$lib/stores/busy.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
	import { waitReady } from '$lib/utils/timeout.utils';

	interface Props {
		button: Snippet<[onclick: (onSwapReady: () => void) => void]>;
	}

	let { button }: Props = $props();

	const isDisabled = (): boolean => isNullish($kongSwapTokensStore);

	const loadKongSwapTokens = async (): Promise<'ready' | undefined> => {
		if (isNullish($authIdentity)) {
			return;
		}

		if (!isDisabled()) {
			return 'ready';
		}

		try {
			await loadKongSwapTokensService({
				identity: $authIdentity,
				allIcrcTokens: [ICP_TOKEN, ...$allIcrcTokens]
			});

			return 'ready';
		} catch (_err: unknown) {
			console.warn('Failed to load KongSwap tokens.');

			return undefined;
		}
	};

	const preloadSwapData = async (onSwapReady: () => void) => {
		if (isNullish($authIdentity)) {
			return;
		}

		busy.start({ msg: $i18n.init.info.hold_loading });

		// 1. If loadKongSwapTokens succeeds within 10s - show modal.
		// 2. If loadKongSwapTokens does not succeed within 10s - show toast, do not show modal.
		// 3. If loadKongSwapTokens throws - show toast, do not show modal.
		await Promise.any([waitReady({ retries: 10, isDisabled }), loadKongSwapTokens()]);

		busy.stop();

		onSwapReady();

		await loadDisabledIcrcTokensBalances({
			identity: $authIdentity,
			disabledIcrcTokens: $allIcrcTokens
		});
		await loadDisabledIcrcTokensExchanges({
			disabledIcrcTokens: $allIcrcTokens
		});
	};
</script>

{@render button(async (onSwapReady: () => void) => await preloadSwapData(onSwapReady))}
