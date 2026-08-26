<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { mapTokenMetadata } from '@icp-sdk/canisters/ledger/icrc';
	import { AnonymousIdentity } from '@icp-sdk/core/agent';
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
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { loadTipPreview, parseClaimCodeFromFragment } from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { consoleWarn } from '$lib/utils/console.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		tipId: string;
	}

	let { tipId }: Props = $props();

	/**
	 * This page has one job: show someone who has never heard of OISY what they
	 * have been given, and get them signed in. The claim itself happens in the
	 * wallet — see `TipClaimModal` — so `handing-off` is the last thing this page
	 * does before the app takes over.
	 *
	 * `unavailable` covers a link nobody can claim: unknown id, expired, already
	 * claimed, or a fragment that did not survive the trip. They are deliberately
	 * indistinguishable, so probing random ids teaches nothing.
	 */
	type PageState = 'loading' | 'preview' | 'handing-off' | 'unavailable';

	let pageState = $state<PageState>('loading');
	let preview = $state<PublicTip | undefined>();
	// Symbol, decimals and logo come from the ledger itself rather than the
	// visitor's token list: whoever opens a tip link may never have held this
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
		pageState = 'unavailable';
	};

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
			// Non-fatal, and it has to stay that way: this page is the cold-start
			// funnel, so a ledger that will not answer must not stop someone signing
			// in.
		}
	};

	/**
	 * Hands the tip to the wallet and goes there.
	 *
	 * The tip travels in memory as the modal's data, never in the URL the wallet
	 * lands on. Nothing has been consumed at this point, so the worst a lost
	 * handover costs is a claim that did not happen, on a link that still works.
	 */
	const handOff = async () => {
		const code = claimCode();

		if (isNullish(code)) {
			toUnavailable();
			return;
		}

		// Set before the navigation, both to keep this from running twice and
		// because `core/Modals.svelte` reads the store as the app shell mounts.
		pageState = 'handing-off';

		modalStore.openTipClaim({ id: Symbol(), data: { tipId, claimCode: code } });

		try {
			await goto(AppPath.Tokens);
		} catch (err: unknown) {
			consoleWarn('Could not open the wallet to claim a tip', err);
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

		// Someone already signed in has nothing left to read here.
		if (nonNullish($authIdentity)) {
			await handOff();
			return;
		}

		try {
			preview = await loadTipPreview({ tipId });
			pageState = 'preview';
			void loadTokenMetadata(preview.ledger_canister_id);
		} catch (_: unknown) {
			toUnavailable();
		}
	};

	onMount(load);

	// Signing in happens in a popup, so this component stays mounted and simply
	// carries on as the identity appears — no round-trip through a URL.
	$effect(() => {
		if (nonNullish($authIdentity) && pageState === 'preview') {
			void handOff();
		}
	});

	const toWallet = async () => await goto(AppPath.Tokens);

	/**
	 * Never prints a number the ledger has not told us how to render. The earlier
	 * fallback printed raw base units, so a slow or silent ledger turned "1 ICP"
	 * into "100000000" in the headline — a claim about money that is off by eight
	 * orders of magnitude. Saying nothing is the honest failure here.
	 */
	let amountLabel = $derived.by(() =>
		nonNullish(preview) && nonNullish(decimals) && nonNullish(symbol)
			? `${formatToken({ value: preview.amount, unitName: decimals, displayDecimals: decimals })} ${symbol}`
			: undefined
	);

	let expiresAt = $derived.by(() =>
		nonNullish(preview)
			? new Date(Number(preview.expires_at_ns / 1_000_000n)).toLocaleString()
			: undefined
	);
</script>

{#if pageState === 'preview'}
	<TipClaimHero {logo} {symbol} />

	<h1 class="mb-3 text-center text-xl">
		{nonNullish(amountLabel)
			? replacePlaceholders($i18n.tip.text.claim_ready_title, { $amount: amountLabel })
			: $i18n.tip.text.claim_ready_title_plain}
	</h1>

	<p class="mb-2 text-center text-tertiary">{$i18n.tip.text.claim_ready_description}</p>

	{#if nonNullish(expiresAt)}
		<p class="mb-2 text-center text-sm text-tertiary">
			{replacePlaceholders($i18n.tip.text.claim_expires, { $date: expiresAt })}
		</p>
	{/if}

	<!--
		Ahead of sign-in on purpose. The claim follows straight from signing in, so
		this is the last moment the recipient can decide whether the sender learning
		their identity is a price they want to pay — and the first moment they can
		read it without having identified themselves to anyone.
	-->
	<p class="mb-6 text-center text-sm text-tertiary">{$i18n.tip.text.claimer_disclosure}</p>

	<!--
		The same sign-in block as the landing page, deliberately: this page is the
		feature's cold-start funnel, so it must offer every provider the landing
		page does — not a reduced one — and it carries the terms line with it.
	-->
	<ButtonAuthenticateWithHelp fullWidth helpAlignment="center" needHelpLink={false} />
{:else if pageState === 'handing-off'}
	<!--
		One frame in practice: the wallet is a client-side navigation away, and the
		claim is announced there. Unlabelled on purpose — anything said here would be
		replaced before it could be read.
	-->
	<div class="flex justify-center py-12 text-brand-primary">
		<Spinner size="32px" />
	</div>
{:else if pageState === 'unavailable'}
	<h1 class="mb-3 text-center text-xl">{$i18n.tip.text.unavailable_title}</h1>

	<p class="mb-6 text-center text-tertiary">{$i18n.tip.text.unavailable_description}</p>

	<Button fullWidth onclick={toWallet}>{$i18n.tip.text.take_me_to_wallet}</Button>
{/if}

<!--
	This page renders outside the app shell, so the help modal the sign-in block
	can open has to be mounted here — `core/Modals.svelte` is not in the tree.
-->
{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}
