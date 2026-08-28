<script lang="ts">
	import { fromNullable, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { mapTokenMetadata } from '@icp-sdk/canisters/ledger/icrc';
	import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
	import type { Principal } from '@icp-sdk/core/principal';
	import { onMount } from 'svelte';
	import type { TipDetails } from '$declarations/backend/backend.did';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import { metadata as ledgerMetadata } from '$icp/api/icrc-ledger.api';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import { setCustomToken } from '$icp-eth/services/icrc-token.services';
	import failedTipImg from '$lib/assets/failed-vip-reward.svg';
	import Sprinkles from '$lib/components/sprinkles/Sprinkles.svelte';
	import TipClaimHero from '$lib/components/tip/TipClaimHero.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { TIP_CLAIM_RETRY_BUTTON, TIP_RECEIVED_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
	import { trackTip, type TipClaimOutcome } from '$lib/services/tip-analytics.services';
	import { claimTip, loadTipDetails } from '$lib/services/tip.services';
	import { autoLoadSingleToken } from '$lib/services/token.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { userProfileCreated } from '$lib/stores/user-profile.store';
	import type { PendingTipClaim } from '$lib/types/tip';
	import { consoleWarn } from '$lib/utils/console.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { hasSeenTipWelcome, rememberTipWelcomeSeen } from '$lib/utils/tip.utils';

	interface Props {
		pending: PendingTipClaim;
	}

	let { pending }: Props = $props();

	/**
	 * `unavailable` and `uncovered` come from different calls and mean different
	 * things: the first is the link (unknown, expired, already claimed, wrong
	 * code — one indistinguishable response by design), the second is a payout the
	 * sender no longer covers, and `shortBalance` is the reservation still standing
	 * with the sender's money gone. `failed` is none of those — our own call did
	 * not complete. Everything except `unavailable` is worth retrying, but only
	 * these three can say anything useful about why.
	 */
	type ClaimState =
		'claiming' | 'received' | 'unavailable' | 'uncovered' | 'shortBalance' | 'failed';

	let claimState = $state<ClaimState>('claiming');
	let amountLabel = $state<string | undefined>();
	let message = $state<string | undefined>();
	// From the ledger itself, not the claimer's token list: whoever opens a tip
	// link may never have held this token, so the list is the wrong place to look
	// for how to render it.
	let symbol = $state<string | undefined>();
	let decimals = $state<number | undefined>();
	let logo = $state<string | undefined>();
	// Kept from the claim so the token can be switched on for a claimer who has
	// never held it.
	let claimedLedgerId = $state<Principal | undefined>();

	const close = () => modalStore.close();

	/**
	 * Makes the tokens visible.
	 *
	 * An ICRC token only renders in the wallet once it is enabled, so a claimer who
	 * has never held this ck-asset would watch a payout succeed and then find
	 * nothing in their list. Same treatment a reward gets on the way out
	 * (`VipRewardStateModal`) and a swap gives its ck destination.
	 *
	 * Nothing to do for ICP, which is never a custom token — the lookup simply
	 * misses and `autoLoadSingleToken` skips. It also skips a token already
	 * enabled, and it swallows and reports its own failures, so this can never turn
	 * a successful claim into a failed one.
	 */
	const enableClaimedToken = async () => {
		if (isNullish(claimedLedgerId)) {
			return;
		}

		const ledgerCanisterId = claimedLedgerId.toText();

		await autoLoadSingleToken({
			token: $icrcTokens.find((token) => token.ledgerCanisterId === ledgerCanisterId),
			identity: $authIdentity,
			setToken: setCustomToken,
			loadTokens: loadCustomTokens,
			errorMessage: $i18n.init.error.icrc_custom_token
		});
	};

	// On the way out rather than while the confirmation is up: enabling shows the
	// global busy overlay, which belongs over a transition and not over the
	// celebration. By the time the wallet appears the balance is already there.
	const leaveForWallet = async () => {
		await enableClaimedToken();

		// Whether this claimer needs OISY explained to them, read before `close()`
		// resets the modal store.
		//
		// Two conditions, and both are needed. `$userProfileCreated` is the canister
		// saying it had never seen this principal before this sign-in, which is what
		// keeps the introduction away from someone who has used OISY for months and
		// happens to be claiming their first tip. The stored flag then keeps it to
		// once, because a signup session can claim more than one tip.
		const principal = $authIdentity?.getPrincipal().toText();
		const introduce = $userProfileCreated && nonNullish(principal) && !hasSeenTipWelcome(principal);

		close();

		// Opened after the close, not instead of it: the store holds one modal, so
		// the welcome replaces the confirmation rather than racing it. The wallet is
		// already underneath with the tip in it either way.
		if (introduce && nonNullish(principal)) {
			rememberTipWelcomeSeen(principal);
			trackTip({ step: 'welcome', side: 'claimer' });
			modalStore.openTipWelcome(Symbol());
		}
	};

	// The canister wrapper throws the candid `Err` variant; a call that never
	// completed throws an `Error`. That difference is the whole point below.
	const isUncovered = (err: unknown): boolean =>
		typeof err === 'object' && err !== null && 'Uncovered' in err;

	// The canister distinguishes this from `Uncovered` because the difference
	// matters to the reader: the reservation still stands and their link still
	// works, so coming back later is a real option rather than a platitude.
	const isShortBalance = (err: unknown): boolean =>
		typeof err === 'object' && err !== null && 'InsufficientFunds' in err;

	/**
	 * Only the canister itself saying the link is dead may be reported as dead.
	 *
	 * Anything else — a dropped connection, an expired delegation, a rate limit, a
	 * stale bundle — is this end failing, and "this tip is no longer available"
	 * would then be a false statement about someone's money, and one they cannot
	 * act on. Those get the retryable state instead. Found the hard way: a live
	 * tip with a valid code read as gone because the call failed locally.
	 */
	const isUnavailable = (err: unknown): boolean =>
		typeof err === 'object' && err !== null && ('NotFound' in err || 'InvalidTipId' in err);

	const loadTokenMetadata = async (ledger: Principal) => {
		try {
			const meta = mapTokenMetadata(
				await ledgerMetadata({
					certified: false,
					identity: new AnonymousIdentity(),
					ledgerCanisterId: ledger.toText()
				})
			);

			if (nonNullish(meta)) {
				({ symbol, decimals } = meta);
				logo = meta.icon;
			}
		} catch (_: unknown) {
			// Non-fatal: a missing symbol costs a label, and no label is a better
			// outcome than blocking a payout over a cosmetic lookup.
		}
	};

	/**
	 * The review, or which state to fall into instead.
	 *
	 * `unavailable` covers every reason the canister refuses a link — unknown id,
	 * expired, already claimed, wrong code — which it answers identically on
	 * purpose, and so does this.
	 */
	const loadDetails = async (params: {
		identity: Identity;
		tipId: string;
		claimCode: string;
	}): Promise<{ details: TipDetails } | { failure: TipClaimOutcome }> => {
		try {
			return { details: await loadTipDetails(params) };
		} catch (err: unknown) {
			// Logged, not swallowed. A silent catch here cost an afternoon: the screen
			// said the tip was gone while the canister was answering fine, and there
			// was nothing anywhere to say which call had actually failed.
			consoleWarn('Could not read the tip to claim', err);

			return { failure: isUnavailable(err) ? 'unavailable' : 'failed' };
		}
	};

	/**
	 * Claims the tip, then says so.
	 *
	 * This runs here, inside the app, rather than on the `/tip/<id>` route that
	 * received the link: a claim is a thing that happens to your wallet, and it
	 * should be watched from your wallet — the same way a reward is. The route
	 * hands the tip over and navigates; everything from the payout onwards belongs
	 * to this modal.
	 */
	const claim = async () => {
		const identity = $authIdentity;

		if (isNullish(identity)) {
			// Unreachable through `core/Modals.svelte`, which only renders while
			// signed in. Treated as retryable rather than swallowed.
			claimState = 'failed';
			return;
		}

		const { tipId, claimCode } = pending;

		claimState = 'claiming';

		// Reading the review the recipient no longer has to confirm. It validates the
		// code before anything moves, and it carries the sender's message, which is
		// revealed to whoever claimed and to nobody else.
		const outcome = await loadDetails({ identity, tipId, claimCode });

		if (!('details' in outcome)) {
			claimState = outcome.failure;

			// Tracked here too: a claim that never got past reading the tip is still a
			// claim that failed, and leaving it out would make the funnel look better
			// than it is.
			trackTip({
				step: 'claim',
				side: 'claimer',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				outcome: outcome.failure
			});

			return;
		}

		const { details } = outcome;

		// Started, not awaited: the label needs the ledger's decimals and symbol,
		// and that lookup has no business delaying a payout.
		const metadata = loadTokenMetadata(details.ledger_canister_id);

		try {
			const claimed = await claimTip({ identity, tipId, claimCode });

			await metadata;

			// Never a number the ledger has not told us how to render: printing base
			// units would put a figure eight orders of magnitude out on the line
			// confirming what someone was just paid.
			claimedLedgerId = details.ledger_canister_id;
			amountLabel =
				nonNullish(decimals) && nonNullish(symbol)
					? `${formatToken({ value: claimed.amount, unitName: decimals, displayDecimals: decimals })} ${symbol}`
					: undefined;
			message = fromNullable(details.message);
			claimState = 'received';

			trackTip({
				step: 'claim',
				side: 'claimer',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				symbol
			});
		} catch (err: unknown) {
			consoleWarn('Could not claim the tip', err);

			// A tip claimed by someone else in the meantime is gone, and a retry
			// would never work; a failed call is the opposite.
			//
			// Named rather than assigned straight to `claimState`, so the same value
			// types-checks as an analytics outcome without a cast — `ClaimState` also
			// covers `claiming` and `received`, which are not outcomes, and a cast here
			// would silently survive either union gaining a member.
			const outcome: TipClaimOutcome = isUncovered(err)
				? 'uncovered'
				: isShortBalance(err)
					? 'shortBalance'
					: isUnavailable(err)
						? 'unavailable'
						: 'failed';

			claimState = outcome;

			trackTip({
				step: 'claim',
				side: 'claimer',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				outcome,
				symbol
			});
		}
	};

	onMount(claim);

	// Kept together rather than spread across four template branches: these three
	// differ only in what they say, and a reader comparing them should be able to
	// see all of it at once.
	let failure = $derived.by(() => {
		const { text } = $i18n.tip;

		if (claimState === 'uncovered') {
			return { title: text.uncovered_title, description: text.uncovered_description };
		}

		if (claimState === 'shortBalance') {
			return { title: text.short_balance_title, description: text.short_balance_description };
		}

		if (claimState === 'unavailable') {
			return { title: text.unavailable_title, description: text.unavailable_description };
		}

		return { title: text.claim_failed_title, description: text.claim_failed };
	});

	let title = $derived(
		nonNullish(amountLabel) && notEmptyString(amountLabel)
			? replacePlaceholders($i18n.tip.text.received_title, { $amount: amountLabel })
			: $i18n.tip.text.claimed_title
	);
</script>

<!-- The same welcome a reward gets. It is money arriving, unasked for. -->
{#if claimState === 'received'}
	<Sprinkles />
{/if}

<!--
	No title snippet, so no header and no close cross: the way out of this is the
	button that acknowledges it. While the claim is in flight nothing dismisses it
	at all — a modal that can be clicked away mid-payout would leave the outcome
	of a money movement unreported.
-->
<Modal disablePointerEvents={claimState === 'claiming'} onClose={close}>
	<ContentWithToolbar>
		{#if claimState === 'claiming' || claimState === 'received'}
			<TipClaimHero {logo} {symbol} />
		{/if}

		{#if claimState === 'claiming'}
			<h3 class="mb-3 text-center">{$i18n.tip.text.claiming_title}</h3>

			<p class="mb-6 text-center text-tertiary">{$i18n.tip.text.claiming_description}</p>

			<div class="flex justify-center text-brand-primary">
				<Spinner size="32px" />
			</div>
		{:else if claimState === 'received'}
			<h3 class="mb-3 text-center">{title}</h3>

			<p class="mb-6 text-center text-tertiary">{$i18n.tip.text.received_description}</p>

			<!--
				The sender's message is revealed only to whoever claimed, and this is the
				one place it is shown: the anonymous preview must not carry it, and the
				review step it used to sit on is gone.
			-->
			{#if nonNullish(message) && notEmptyString(message)}
				<p class="mb-6 text-center italic">“{message}”</p>
			{/if}

			<div class="mb-2">
				<ModalValue>
					{#snippet label()}{$i18n.tip.text.network}{/snippet}
					{#snippet mainValue()}{ICP_NETWORK.name}{/snippet}
				</ModalValue>

				{#if nonNullish(symbol) && notEmptyString(symbol)}
					<ModalValue>
						{#snippet label()}{$i18n.tip.text.claim_token}{/snippet}
						{#snippet mainValue()}{symbol}{/snippet}
					</ModalValue>
				{/if}

				<ModalValue>
					{#snippet label()}{$i18n.tip.text.claim_status}{/snippet}
					{#snippet mainValue()}<span class="text-success-primary"
							>{$i18n.tip.text.status_completed}</span
						>{/snippet}
				</ModalValue>
			</div>
		{:else}
			<!--
				The same artwork every bad state in the app uses, so a claimer who has
				seen a failed reward recognises the shape of this screen before reading
				it. Text alone made all four outcomes look identical.
			-->
			<ImgBanner alt={$i18n.tip.alt.claim_failed_illustration} src={failedTipImg} />

			<h3 class="mt-6 mb-3 text-center">{failure.title}</h3>

			<p class="mb-6 text-center text-tertiary">{failure.description}</p>
		{/if}

		{#snippet toolbar()}
			{#if claimState === 'received'}
				<Button
					colorStyle="secondary-light"
					fullWidth
					onclick={leaveForWallet}
					testId={TIP_RECEIVED_BUTTON}
				>
					{$i18n.tip.text.take_me_to_wallet}
				</Button>
			{:else if claimState !== 'claiming'}
				<!--
					Close is always here. The failed state used to offer "Try again" and
					nothing else, and since this modal has no title bar there was no cross
					either — a reader whose claim failed was stuck on the screen with no way
					out but the browser.

					Retry only where it could work. `unavailable` means the canister says the
					link is dead, and `uncovered` means the sender has taken the reservation
					back — both would fail identically every time, and offering a retry
					would contradict what the screen just said to do instead.
				-->
				<div class="flex w-full gap-3">
					<Button colorStyle="secondary-light" fullWidth onclick={close}>
						{$i18n.core.text.close}
					</Button>

					{#if claimState === 'failed' || claimState === 'shortBalance'}
						<Button fullWidth onclick={claim} testId={TIP_CLAIM_RETRY_BUTTON}>
							{$i18n.tip.text.claim_retry}
						</Button>
					{/if}
				</div>
			{/if}
		{/snippet}
	</ContentWithToolbar>
</Modal>
