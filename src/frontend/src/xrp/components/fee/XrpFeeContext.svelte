<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, onDestroy, type Snippet, untrack } from 'svelte';
	import type { Token } from '$lib/types/token';
	import { loadXrpOpenLedgerFee } from '$xrp/api/xrpl.api';
	import { XRP_DEFAULT_FEE_DROPS } from '$xrp/constants/xrp.constants';
	import { XRP_FEE_CONTEXT_KEY, type XrpFeeContext } from '$xrp/stores/xrp-fee.store';
	import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';

	interface Props {
		token: Token;
		observe: boolean;
		children: Snippet;
	}

	let { token, observe, children }: Props = $props();

	const { feeStore }: XrpFeeContext = getContext<XrpFeeContext>(XRP_FEE_CONTEXT_KEY);

	const estimateFee = async () => {
		if (!observe || isNullish(token)) {
			return;
		}

		const network = mapNetworkIdToNetwork(token.network.id);

		if (isNullish(network)) {
			return;
		}

		try {
			feeStore.setFee(await loadXrpOpenLedgerFee({ network, fallbackFee: XRP_DEFAULT_FEE_DROPS }));
		} catch (_: unknown) {
			// The fee is best-effort; fall back to the default so the UI always has a value.
			feeStore.setFee(XRP_DEFAULT_FEE_DROPS);
		}
	};

	let timer = $state<NodeJS.Timeout | undefined>();

	const clearTimer = () => clearInterval(timer);

	const updateFee = async () => {
		clearTimer();

		await estimateFee();

		timer = setInterval(estimateFee, 10000);
	};

	$effect(() => {
		[token];

		untrack(() => updateFee());
	});

	onDestroy(clearTimer);
</script>

{@render children()}
