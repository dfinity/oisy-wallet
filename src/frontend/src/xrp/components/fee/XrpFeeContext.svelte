<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, onDestroy, type Snippet, untrack } from 'svelte';
	import { xrpAddressMainnet } from '$lib/derived/address.derived';
	import type { Token } from '$lib/types/token';
	import { XRP_DEFAULT_FEE_DROPS } from '$xrp/constants/xrp.constants';
	import {
		XrpAccountNotFoundError,
		loadXrpAccountInfo,
		loadXrpOpenLedgerFee
	} from '$xrp/rest/xrpl.rest';
	import { XRP_FEE_CONTEXT_KEY, type XrpFeeContext } from '$xrp/stores/xrp-fee.store';
	import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
	import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';

	interface Props {
		token: Token;
		observe: boolean;
		children: Snippet;
	}

	let { token, observe, children }: Props = $props();

	const { feeStore, reserveStore }: XrpFeeContext = getContext<XrpFeeContext>(XRP_FEE_CONTEXT_KEY);

	// The reserve depends on how many ledger objects the account owns, which only
	// `account_info` reports. It is fetched once per account rather than on the fee timer:
	// unlike the fee it does not move while a send is being composed.
	const loadReserve = async () => {
		if (!observe || isNullish(token)) {
			return;
		}

		const network = mapNetworkIdToNetwork(token.network.id);
		const address = $xrpAddressMainnet;

		if (isNullish(network) || isNullish(address)) {
			return;
		}

		try {
			const { ownerCount } = await loadXrpAccountInfo({ address, network });

			reserveStore.setReserve(getXrpReserveDrops({ ownerCount }));
		} catch (err: unknown) {
			// An account that is not on-ledger owns nothing, so the base reserve genuinely describes
			// it. Any other failure leaves the requirement unknown, and base-only is the SMALLEST
			// figure the ledger can demand — using it would overstate the sendable maximum for an
			// account that owns objects, so the reserve is marked unavailable and the send blocked.
			reserveStore.setReserve(
				err instanceof XrpAccountNotFoundError ? getXrpReserveDrops({ ownerCount: 0 }) : undefined
			);
		}
	};

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

	// The interval is installed only AFTER the first request resolves, so the clear at the top of
	// `updateFee` cannot cover it. Without a generation marker an unmount or a rerun during that
	// request would leave the resolving call to install a poller nothing holds a handle to, and two
	// overlapping calls would both assign `timer`, leaking the first interval.
	let updateId = 0;

	const clearTimer = () => clearInterval(timer);

	const updateFee = async () => {
		const id = ++updateId;

		clearTimer();

		if (!observe) {
			return;
		}

		await estimateFee();

		if (id !== updateId || !observe) {
			return;
		}

		timer = setInterval(estimateFee, 10000);
	};

	$effect(() => {
		[token, $xrpAddressMainnet, observe];

		untrack(() => {
			void updateFee();
			void loadReserve();
		});
	});

	onDestroy(() => {
		updateId++;
		clearTimer();
	});
</script>

{@render children()}
