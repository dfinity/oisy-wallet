<script lang="ts">
	import {
		fromNullable,
		isNullish,
		nonNullish,
		notEmptyString,
		secondsToDuration
	} from '@dfinity/utils';
	import { mapTokenMetadata } from '@icp-sdk/canisters/ledger/icrc';
	import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
	import type { Principal } from '@icp-sdk/core/principal';
	import { onMount } from 'svelte';
	import type { TipDetails } from '$declarations/backend/backend.did';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import { ICP_TOKEN, TESTICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { metadata as ledgerMetadata } from '$icp/api/icrc-ledger.api';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import { loadCustomTokens } from '$icp/services/icrc.services';
	import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
	import { setCustomToken } from '$icp-eth/services/icrc-token.services';
	import { setCustomToken as setCustomTokenApi } from '$lib/api/backend.api';
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
	import { userProfileLoaded } from '$lib/derived/user-profile.derived';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
	import { trackTip, type TipClaimOutcome } from '$lib/services/tip-analytics.services';
	import { claimTip, loadTipDetails, tipRateLimit } from '$lib/services/tip.services';
	import { autoLoadSingleToken } from '$lib/services/token.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { userProfileCreated } from '$lib/stores/user-profile.store';
	import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
	import type { PendingTipClaim } from '$lib/types/tip';
	import { consoleWarn } from '$lib/utils/console.utils';
	import { toCustomToken } from '$lib/utils/custom-token.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { waitReady } from '$lib/utils/timeout.utils';
	import {
		hasSeenTipWelcome,
		isTipUnavailable,
		rememberTipWelcomeSeen
	} from '$lib/utils/tip.utils';

	interface Props {
		pending: PendingTipClaim;
	}

	let { pending }: Props = $props();

	/**
	 * How long the handover waits for the profile to land, as `waitReady` retries
	 * at its default half-second interval — so about five seconds.
	 *
	 * Long enough for a canister call that is already in flight, short enough that
	 * a claimer whose profile load has genuinely failed is not held on a screen
	 * whose work is finished. The cost of giving up early is a missed welcome, not
	 * a missed payout.
	 */
	const PROFILE_READY_RETRIES = 10;

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
	// Set only when the canister turned the call away on a rate limit. Kept beside
	// `claimState` rather than inside it: a limit is not a different outcome for
	// the tip — the link is still good — it is the same `failed` state with an
	// answer to "when should I try again".
	let rateLimit = $state<ReturnType<typeof tipRateLimit>>();
	let claimedAmount = $state<bigint | undefined>();
	let message = $state<string | undefined>();
	// From the ledger itself, not the claimer's token list: whoever opens a tip
	// link may never have held this token, so the list is the wrong place to look
	// for how to render it.
	let symbol = $state<string | undefined>();
	let decimals = $state<number | undefined>();
	let logo = $state<string | undefined>();
	// Derived rather than assigned once: `claimedAmount` is set the instant the
	// payout returns, and the label fills in by itself when the ledger's decimals
	// and symbol arrive. Never a number the ledger has not told us how to render —
	// printing base units would put a figure eight orders of magnitude out on the
	// line confirming what someone was just paid.
	let amountLabel = $derived(
		nonNullish(claimedAmount) && nonNullish(decimals) && nonNullish(symbol)
			? `${formatToken({ value: claimedAmount, unitName: decimals, displayDecimals: decimals })} ${symbol}`
			: undefined
	);
	// Kept from the claim so the token can be switched on for a claimer who has
	// never held it.
	let claimedLedgerId = $state<Principal | undefined>();
	// True while the handover is running its canister writes.
	let handingOff = $state(false);

	const close = () => modalStore.close();

	/**
	 * Makes the tokens visible.
	 *
	 * An ICRC token only renders in the wallet once it is enabled, so a claimer who
	 * has never held this ck-asset would watch a payout succeed and then find
	 * nothing in their list. Same treatment a reward gets on the way out
	 * (`VipRewardStateModal`) and a swap gives its ck destination.
	 *
	 * Three cases, and the third is the one that used to be missing. ICP is always
	 * visible and never a custom token, so it is left alone. A token already in the
	 * claimer's list is enabled. A token in neither — one the *sender* imported —
	 * is registered from its ledger id, because `icrcTokens` is the defaults plus
	 * the claimer's own imports and a stranger's token is in neither half.
	 *
	 * Every path reports its own failures and none rethrows: the money has already
	 * moved by the time this runs, so nothing here may turn a successful claim into
	 * a failed one.
	 */
	const enableClaimedToken = async () => {
		if (isNullish(claimedLedgerId) || isNullish($authIdentity)) {
			return;
		}

		const ledgerCanisterId = claimedLedgerId.toText();

		// ICP is never a custom token and is always visible, so there is nothing to
		// enable and — more to the point — nothing to add. Checked before the branch
		// below, which would otherwise read "not in the list" as "import it" and
		// register the ICP ledger as though the claimer had pasted it in by hand.
		if ([ICP_TOKEN, TESTICP_TOKEN].some(({ ledgerCanisterId: id }) => id === ledgerCanisterId)) {
			return;
		}

		const held = $icrcTokens.find((token) => token.ledgerCanisterId === ledgerCanisterId);

		// Already in their list: a default ck-asset, or one they hold. Enabling is
		// all that is needed, and `autoLoadSingleToken` skips a token already on.
		if (nonNullish(held)) {
			await autoLoadSingleToken({
				token: held,
				identity: $authIdentity,
				setToken: setCustomToken,
				loadTokens: loadCustomTokens,
				errorMessage: $i18n.init.error.icrc_custom_token
			});

			return;
		}

		// Absent from the *rendered* list is not the same as absent from the
		// backend, and `set_custom_token` is a versioned upsert that **traps** on a
		// mismatch rather than refusing politely (`token/service.rs`). `icrcTokens`
		// hides testnet tokens whenever testnets are off, so a row the claimer
		// really has can be missing from the lookup above — and a versionless save
		// for it would take down the call. Asked of the unfiltered store, which is
		// the closest thing on this side to what the canister holds, and its
		// version is carried through so the upsert is an update rather than a
		// collision.
		const registered = ($icrcCustomTokensStore ?? [])
			.map(({ data }) => data)
			.find((token) => token.ledgerCanisterId === ledgerCanisterId);

		// Not in their list at all, which is the case that used to end in silence:
		// `icrcTokens` is the defaults plus the claimer's *own* imports, so a token
		// the sender imported is absent, the lookup missed, and the claim finished
		// with the tokens really theirs and nothing on screen to show for it.
		//
		// Registered from the ledger id alone — the only thing the save needs, since
		// `toCustomToken` reduces an ICRC token to its ledger and index canisters,
		// and `loadCustomTokens` reads the metadata back off the ledger afterwards.
		// No index canister: the claimer has no reason to know of one, and without
		// it the balance still shows, which is what was missing.
		//
		// Nothing is taken on trust here. The tip was created against this ledger,
		// the canister just moved tokens through it with `icrc2_transfer_from`, and
		// this screen has already read its metadata for the line above — so it is a
		// working ICRC ledger on better evidence than the manual import flow has.
		try {
			await setCustomTokenApi({
				identity: $authIdentity,
				token: toCustomToken({
					ledgerCanisterId,
					indexCanisterId: registered?.indexCanisterId,
					// Absent for a token the backend has never seen, which is what tells
					// it to insert rather than update.
					version: registered?.version,
					enabled: true,
					networkKey: 'Icrc'
				} as SaveCustomTokenWithKey)
			});

			await loadCustomTokens({ identity: $authIdentity });
		} catch (err: unknown) {
			// Reported, never rethrown: the claim has already succeeded and the money
			// has already moved. A token that did not get registered is a wallet the
			// claimer has to add one row to, not a failed claim.
			toastsError({ msg: { text: $i18n.init.error.icrc_custom_token }, err });
		}
	};

	// On the way out rather than while the confirmation is up: enabling shows the
	// global busy overlay, which belongs over a transition and not over the
	// celebration. By the time the wallet appears the balance is already there.
	const leaveForWallet = async () => {
		// A second tap must not start a second handover. Without `autoLoadSingleToken`
		// on the registration path there is no global busy overlay to sit in the way,
		// so a double-click issued two saves — and the second met the first one's
		// freshly written row with no version, which `set_custom_token` answers by
		// trapping. Checked before the wait below, so a tap during it is turned away
		// rather than queued behind it. The button is disabled from here too, so the
		// guard is the backstop rather than the only defence.
		if (handingOff) {
			return;
		}

		handingOff = true;

		try {
			// Everything below reads state the loader tree is still filling in, and
			// this modal is mounted by `Modals` inside `AuthGuard` — beside that tree,
			// not beneath it — so nothing orders the two. A first-time claimer is both
			// the person whose profile is still being created and the one most likely
			// to tap straight through, which is how the welcome came to be skipped for
			// exactly the person it exists for.
			//
			// Bounded rather than indefinite: if the profile never lands, the claim is
			// still done and the money is still theirs, so the handover proceeds on
			// what is known rather than trapping the reader on a screen they have
			// finished with. Waiting first also gives the token list time to arrive,
			// which is what decides whether `enableClaimedToken` enables a default or
			// registers it.
			await waitReady({ retries: PROFILE_READY_RETRIES, isDisabled: () => !$userProfileLoaded });

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
			const introduce =
				$userProfileCreated && nonNullish(principal) && !hasSeenTipWelcome(principal);

			close();

			// Opened after the close, not instead of it: the store holds one modal, so
			// the welcome replaces the confirmation rather than racing it. The wallet is
			// already underneath with the tip in it either way.
			if (introduce && nonNullish(principal)) {
				rememberTipWelcomeSeen(principal);
				trackTip({ step: 'welcome', side: 'claimer' });
				modalStore.openTipWelcome(Symbol());
			}
		} finally {
			handingOff = false;
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
	}): Promise<
		{ details: TipDetails } | { failure: TipClaimOutcome; limit: ReturnType<typeof tipRateLimit> }
	> => {
		try {
			return { details: await loadTipDetails(params) };
		} catch (err: unknown) {
			// Logged, not swallowed. A silent catch here cost an afternoon: the screen
			// said the tip was gone while the canister was answering fine, and there
			// was nothing anywhere to say which call had actually failed.
			consoleWarn('Could not read the tip to claim', err);

			return {
				failure: isTipUnavailable(err) ? 'unavailable' : 'failed',
				limit: tipRateLimit(err)
			};
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
			rateLimit = outcome.limit;

			// Tracked here too: a claim that never got past reading the tip is still a
			// claim that failed, and leaving it out would make the funnel look better
			// than it is.
			trackTip({
				step: 'claim',
				side: 'claimer',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				outcome: outcome.failure,
				...(nonNullish(outcome.limit) && { rateLimited: true })
			});

			return;
		}

		const { details } = outcome;

		// Started, not awaited: the label needs the ledger's decimals and symbol,
		// and that lookup has no business delaying a payout.
		const metadata = loadTokenMetadata(details.ledger_canister_id);

		try {
			const claimed = await claimTip({ identity, tipId, claimCode });

			// Not awaited before flipping to `received`. The payout has happened, and
			// an unresponsive ledger metadata call would otherwise hold the modal on
			// `claiming` after the money had already moved — the one screen that must
			// never lag behind the ledger.
			claimedLedgerId = details.ledger_canister_id;
			claimedAmount = claimed.amount;
			message = fromNullable(details.message);
			claimState = 'received';

			await metadata;

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
					: isTipUnavailable(err)
						? 'unavailable'
						: 'failed';

			claimState = outcome;
			rateLimit = tipRateLimit(err);

			trackTip({
				step: 'claim',
				side: 'claimer',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				outcome,
				symbol,
				...(nonNullish(rateLimit) && { rateLimited: true })
			});
		}
	};

	onMount(claim);

	// Kept together rather than spread across four template branches: these three
	// differ only in what they say, and a reader comparing them should be able to
	// see all of it at once.
	let failure = $derived.by(() => {
		const { text } = $i18n.tip;

		// First, because it outranks whichever call met it: "ask them for a new
		// link" is wrong advice when the link is fine and the only problem is how
		// fast we asked.
		if (nonNullish(rateLimit)) {
			return {
				title: text.rate_limited_title,
				description: replacePlaceholders(text.rate_limited, {
					$duration: secondsToDuration({
						seconds: rateLimit.windowSeconds,
						i18n: $i18n.temporal.seconds_to_duration
					})
				})
			};
		}

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

	/**
	 * The dialog's accessible name.
	 *
	 * This modal has no `title` snippet on purpose — no header, no close cross —
	 * which also left it with nothing for `aria-labelledby` to point at, so it
	 * reached assistive technology as an unnamed dialog about someone's money.
	 * Tracks whichever `h3` is actually on screen, so a screen reader is told what
	 * a sighted reader sees rather than a generic label.
	 */
	let dialogName = $derived(
		claimState === 'claiming'
			? $i18n.tip.text.claiming_title
			: claimState === 'received'
				? title
				: failure.title
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
<Modal ariaLabel={dialogName} disablePointerEvents={claimState === 'claiming'} onClose={close}>
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
				<!--
					Disabled while the handover runs its canister writes. The registration
					path does not go through `autoLoadSingleToken`, so there is no global
					busy overlay in the way of a second tap — and a second save meets the
					first one's freshly written row with no version, which
					`set_custom_token` answers by trapping.
				-->
				<Button
					colorStyle="secondary-light"
					disabled={handingOff}
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
