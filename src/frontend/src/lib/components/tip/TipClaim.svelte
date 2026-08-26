<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { mapTokenMetadata } from '@icp-sdk/canisters/ledger/icrc';
	import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
	import type { Principal } from '@icp-sdk/core/principal';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { PublicTip } from '$declarations/backend/backend.did';
	import { metadata as ledgerMetadata } from '$icp/api/icrc-ledger.api';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import TipClaimHero from '$lib/components/tip/TipClaimHero.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { TIP_CLAIM_RETRY_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import {
		claimTip,
		loadTipDetails,
		loadTipPreview,
		parseClaimCodeFromFragment
	} from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { TipReceipt } from '$lib/types/tip';
	import { consoleWarn } from '$lib/utils/console.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		tipId: string;
	}

	let { tipId }: Props = $props();

	/**
	 * `uncovered` is the only backend failure told apart from the rest, and only
	 * because "come back later" is actionable while "expired" is not. Everything
	 * else — unknown id, expired, already claimed, wrong or missing code —
	 * collapses into `unavailable`, so someone probing random ids learns nothing.
	 *
	 * `failed` is different in kind: the call itself did not land, nothing moved,
	 * and the tip is still claimable — so it is the one state that offers a retry.
	 */
	type ClaimState =
		'loading' | 'preview' | 'claiming' | 'claimed' | 'unavailable' | 'uncovered' | 'failed';

	let claimState = $state<ClaimState>('loading');
	let preview = $state<PublicTip | undefined>();
	// Symbol, decimals and logo come from the ledger itself rather than the
	// recipient's token list: whoever opens a tip link may never have held this
	// token, so the list is exactly the wrong place to look for how to render it.
	let symbol = $state<string | undefined>();
	let decimals = $state<number | undefined>();
	let logo = $state<string | undefined>();

	// The claim code never leaves the fragment, so it is read here rather than
	// from route params — and it survives sign-in because Internet Identity opens
	// in a popup, leaving this page mounted.
	const claimCode = (): string | undefined =>
		browser ? parseClaimCodeFromFragment(window.location.hash) : undefined;

	const toUnavailable = () => {
		preview = undefined;
		claimState = 'unavailable';
	};

	const isUncovered = (err: unknown): boolean =>
		typeof err === 'object' && err !== null && 'Uncovered' in err;

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
	 * Never prints a number the ledger has not told us how to render. The earlier
	 * fallback printed raw base units, so a slow or silent ledger turned "1 ICP"
	 * into "100000000" in the headline — a claim about money that is off by eight
	 * orders of magnitude. Saying nothing is the honest failure here.
	 */
	const amountLabel = (value: bigint): string | undefined =>
		nonNullish(decimals) && nonNullish(symbol)
			? `${formatToken({ value, unitName: decimals, displayDecimals: decimals })} ${symbol}`
			: undefined;

	/**
	 * Pays the tip out, and returns what the confirmation should say.
	 *
	 * `undefined` means the page has been put into a state that explains why
	 * nothing moved — `uncovered` when the reservation is gone, `failed` when the
	 * call itself did not land and a retry is worth offering.
	 */
	const payOut = async ({
		identity,
		code
	}: {
		identity: Identity;
		code: string;
	}): Promise<TipReceipt | undefined> => {
		try {
			// Still fetched, though nothing is reviewed: it validates the code before
			// anything moves, and it carries the sender's message, which is revealed
			// to whoever claimed and to nobody else.
			const details = await loadTipDetails({ identity, tipId, claimCode: code });

			// Started, not awaited: the label needs the ledger's decimals and symbol,
			// and that lookup has no business delaying a payout.
			const metadata = loadTokenMetadata(details.ledger_canister_id);

			const claimed = await claimTip({ identity, tipId, claimCode: code });

			await metadata;

			return {
				// The amount the ledger actually moved, not the one a review promised.
				amountLabel: amountLabel(claimed.amount),
				symbol,
				logo,
				message: details.message[0]
			};
		} catch (err: unknown) {
			claimState = isUncovered(err) ? 'uncovered' : 'failed';
			return undefined;
		}
	};

	/**
	 * Claims as soon as there is an identity, with no confirmation step.
	 *
	 * The step this replaces asked the recipient to press **Claim now** on a
	 * review card. What that step was for was disclosure — the sender learns who
	 * claimed — so the disclosure moved to the screen *before* sign-in, where it
	 * is read by someone who has not yet identified themselves to anyone. Signing
	 * in is now the consent, given at the earliest point it can be rather than the
	 * latest.
	 *
	 * The confirmation lands in the wallet instead: the modal is opened here, then
	 * this page navigates, and `core/Modals.svelte` renders it once the app shell
	 * mounts. Ordering matters — claim first, hand over second. A lost handover
	 * costs a confirmation the recipient can also read off their own balance; a
	 * lost claim would cost them the money.
	 */
	const claim = async () => {
		const code = claimCode();
		const identity = $authIdentity;

		if (isNullish(identity) || isNullish(code)) {
			return;
		}

		claimState = 'claiming';

		const receipt = await payOut({ identity, code });

		if (isNullish(receipt)) {
			return;
		}

		modalStore.openTipReceived({ id: Symbol(), data: receipt });

		claimState = 'claimed';

		try {
			await goto(AppPath.Tokens);
		} catch (err: unknown) {
			// Deliberately not a claim failure. The money has moved; only the ride
			// into the wallet did not, and the `claimed` state above is the way out.
			consoleWarn('Could not open the wallet after claiming a tip', err);
		}
	};

	const load = async () => {
		const code = claimCode();

		if (isNullish(code)) {
			// A link that lost its fragment cannot be claimed by anyone, so it is
			// indistinguishable from a tip that no longer exists.
			toUnavailable();
			return;
		}

		// Someone who is already signed in has nothing left to decide.
		if (nonNullish($authIdentity)) {
			await claim();
			return;
		}

		try {
			preview = await loadTipPreview({ tipId });
			claimState = 'preview';
			void loadTokenMetadata(preview.ledger_canister_id);
		} catch (_: unknown) {
			toUnavailable();
		}
	};

	onMount(load);

	// Signing in happens in a popup, so this component stays mounted and simply
	// carries on as the identity appears — no round-trip through a URL. Gated on
	// `preview` so the claim cannot be started twice.
	$effect(() => {
		if (nonNullish($authIdentity) && claimState === 'preview') {
			void claim();
		}
	});

	const toWallet = async () => await goto(AppPath.Tokens);

	let previewAmountLabel = $derived.by(() =>
		nonNullish(preview) ? amountLabel(preview.amount) : undefined
	);

	let expiresAt = $derived.by(() =>
		nonNullish(preview)
			? new Date(Number(preview.expires_at_ns / 1_000_000n)).toLocaleString()
			: undefined
	);
</script>

{#if claimState !== 'loading'}
	{#if claimState === 'preview'}
		<TipClaimHero {logo} {symbol} />

		<h1 class="mb-3 text-center text-xl">
			{nonNullish(previewAmountLabel)
				? replacePlaceholders($i18n.tip.text.claim_ready_title, { $amount: previewAmountLabel })
				: $i18n.tip.text.claim_ready_title_plain}
		</h1>

		<p class="mb-2 text-center text-tertiary">{$i18n.tip.text.claim_ready_description}</p>

		{#if nonNullish(expiresAt)}
			<p class="mb-2 text-center text-sm text-tertiary">
				{replacePlaceholders($i18n.tip.text.claim_expires, { $date: expiresAt })}
			</p>
		{/if}

		<!--
			Ahead of sign-in on purpose. Claiming now follows straight from signing
			in, so this is the last moment the recipient can decide whether the sender
			learning their identity is a price they want to pay — and the first moment
			they can read it without having identified themselves to anyone.
		-->
		<p class="mb-6 text-center text-sm text-tertiary">{$i18n.tip.text.claimer_disclosure}</p>

		<!--
			The same sign-in block as the landing page, deliberately: this page is the
			feature's cold-start funnel, so it must offer every provider the landing
			page does — not a reduced one — and it carries the terms line with it.
		-->
		<ButtonAuthenticateWithHelp fullWidth helpAlignment="center" needHelpLink={false} />
	{:else if claimState === 'claiming'}
		<TipClaimHero {logo} {symbol} />

		<h1 class="mb-3 text-center text-xl">{$i18n.tip.text.claiming_title}</h1>

		<p class="mb-6 text-center text-tertiary">{$i18n.tip.text.claiming_description}</p>

		<div class="flex justify-center text-brand-primary">
			<Spinner size="32px" />
		</div>
	{:else if claimState === 'claimed'}
		<!--
			Only seen if the navigation into the wallet did not happen — the
			confirmation itself lives there. A dead end here would leave someone
			looking at a spinner after their money had already arrived.
		-->
		<TipClaimHero {logo} {symbol} />

		<h1 class="mb-3 text-center text-xl">{$i18n.tip.text.claimed_title}</h1>

		<p class="mb-6 text-center text-tertiary">{$i18n.tip.text.claimed_description}</p>

		<Button fullWidth onclick={toWallet}>{$i18n.tip.text.take_me_to_wallet}</Button>
	{:else if claimState === 'failed'}
		<MessageBox level="warning" styleClass="mb-6">
			<p>{$i18n.tip.text.claim_failed}</p>
		</MessageBox>

		<Button fullWidth onclick={claim} testId={TIP_CLAIM_RETRY_BUTTON}>
			{$i18n.tip.text.claim_retry}
		</Button>
	{:else if claimState === 'uncovered'}
		<MessageBox level="warning" styleClass="mb-6">
			<h1 class="mb-2 text-xl">{$i18n.tip.text.uncovered_title}</h1>

			<p>{$i18n.tip.text.uncovered_description}</p>
		</MessageBox>

		<Button fullWidth onclick={toWallet}>{$i18n.tip.text.take_me_to_wallet}</Button>
	{:else}
		<h1 class="mb-3 text-center text-xl">{$i18n.tip.text.unavailable_title}</h1>

		<p class="mb-6 text-center text-tertiary">{$i18n.tip.text.unavailable_description}</p>

		<Button fullWidth onclick={toWallet}>{$i18n.tip.text.take_me_to_wallet}</Button>
	{/if}
{/if}

<!--
	This page renders outside the app shell, so the help modal the sign-in block
	can open has to be mounted here — `core/Modals.svelte` is not in the tree.
-->
{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}
