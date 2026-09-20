<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext, onDestroy, type Snippet, untrack } from 'svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { xrpAddressMainnet } from '$lib/derived/address.derived';
	import type { Token } from '$lib/types/token';
	import { XRP_DEFAULT_FEE_DROPS, XRP_MAX_FEE_DROPS } from '$xrp/constants/xrp.constants';
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

	const estimateFee = async (id: number) => {
		if (!observe || isNullish(token)) {
			return;
		}

		const network = mapNetworkIdToNetwork(token.network.id);

		if (isNullish(network)) {
			return;
		}

		try {
			const quote = await loadXrpOpenLedgerFee({ network, fallbackFee: XRP_DEFAULT_FEE_DROPS });

			// Bounded against the same constants `sendXrp` enforces. A quote it would refuse is worse
			// than no quote at all: the schema accepts zero and anything up to the drops ceiling, so it
			// opens the form, is shown as the reviewed fee, and the send dies only after the wizard has
			// advanced — as a plain error, reported as an unexpected failure.
			//
			// The high end is not only a malformed answer. The open-ledger fee escalates with the
			// square of queue occupancy by design, so a congested node can quote above the maximum
			// legitimately, and that is exactly when a send is being composed.
			//
			// Out of range is then treated as the catch treats a throw — unknown on the first load,
			// last valid estimate retained afterwards — so there is one rule rather than two.
			if (quote <= ZERO || quote > XRP_MAX_FEE_DROPS) {
				return;
			}

			// Checked immediately before the write, not after the await in `updateFee` — that check
			// runs once the store has already been changed. A request still in flight when the effect
			// reruns, when `observe` goes false as the send starts, or when the component is destroyed
			// would otherwise publish anyway.
			//
			// `send()` reads the fee twice, once to validate the amount against it and once to sign,
			// so a late write lands between them and signs a figure neither the guard nor the user
			// saw. Freezing the fee for the duration of a send is the whole reason `observe` exists.
			if (id !== generation) {
				return;
			}

			feeStore.setFee(quote);
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

		await estimateFee(id);

		if (id !== generation || !observe) {
			return;
		}

		// The poller carries the generation it was installed under, so a poll resolving after this
		// timer has been superseded is rejected by the same check as the first request.
		timer = setInterval(() => void estimateFee(id), 10000);
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
