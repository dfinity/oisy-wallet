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
	// One generation per effect run, captured by BOTH loaders so they cannot invalidate each
	// other. It is what lets a resolving request tell whether it still owns the stores: for the
	// fee poller the interval is installed only after the first request resolves, so the clear at
	// the top of `updateFee` cannot cover it; for the reserve it keeps an older account's response
	// from overwriting a newer one.
	let generation = 0;

	const loadReserve = async (id: number) => {
		// Cleared up front so the previous account's reserve cannot be used while this loads:
		// `undefined` is the "unknown" state that blocks the form.
		reserveStore.setReserve(undefined);

		if (!observe || isNullish(token)) {
			return;
		}

		const network = mapNetworkIdToNetwork(token.network.id);
		const address = $xrpAddressMainnet;

		if (isNullish(network) || isNullish(address)) {
			return;
		}

		try {
			// The validated ledger, like the balance this reserve is displayed beside: a shown figure
			// that can roll back is worse than one a few seconds stale, and two numbers the user does
			// arithmetic on should come from the same ledger.
			//
			// It can therefore sit below the count `sendXrp` uses — that one takes the higher of both
			// snapshots — so the form may accept an amount the send then refuses. A wrinkle rather
			// than a hazard: the authoritative check runs at send time and fails closed.
			const { ownerCount } = await loadXrpAccountInfo({
				address,
				network,
				ledgerIndex: 'validated'
			});

			if (id !== generation) {
				return;
			}

			reserveStore.setReserve(getXrpReserveDrops({ ownerCount }));
		} catch (err: unknown) {
			if (id !== generation) {
				return;
			}

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
			// Nothing is published. `loadXrpOpenLedgerFee` already applies the fallback to the one case
			// it fits — a successful response that omits the estimate — and throws for everything else,
			// so reaching here means no node quoted a fee. Answering that with the base fee is what its
			// own comment warns against: it underprices the send on exactly the congested node that
			// refused to quote, and it would open a form the unknown fee is meant to keep shut.
			//
			// So the first failure leaves the fee unknown, and a later one keeps the last estimate: ten
			// seconds stale beats both a guess and a blank field. `loadReserve` clears instead, because
			// a reserve belongs to one account and must not survive into another; the fee is a property
			// of the network and does not.
		}
	};

	let timer = $state<NodeJS.Timeout | undefined>();

	const clearTimer = () => clearInterval(timer);

	const updateFee = async (id: number) => {
		clearTimer();

		if (!observe) {
			return;
		}

		await estimateFee();

		if (id !== generation || !observe) {
			return;
		}

		timer = setInterval(estimateFee, 10000);
	};

	$effect(() => {
		[token, $xrpAddressMainnet, observe];

		untrack(() => {
			const id = ++generation;

			void updateFee(id);
			void loadReserve(id);
		});
	});

	onDestroy(() => {
		generation++;
		clearTimer();
	});
</script>

{@render children()}
