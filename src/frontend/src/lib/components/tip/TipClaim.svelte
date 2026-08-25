<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { mapTokenMetadata } from '@icp-sdk/canisters/ledger/icrc';
	import { AnonymousIdentity } from '@icp-sdk/core/agent';
	import type { Principal } from '@icp-sdk/core/principal';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { PublicTip, TipDetails } from '$declarations/backend/backend.did';
	import { metadata as ledgerMetadata } from '$icp/api/icrc-ledger.api';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import TipClaimHero from '$lib/components/tip/TipClaimHero.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { TIP_CLAIM_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import {
		claimTip,
		loadTipDetails,
		loadTipPreview,
		parseClaimCodeFromFragment
	} from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		tipId: string;
	}

	let { tipId }: Props = $props();

	/**
	 * `uncovered` is the only failure told apart from the rest, and only because
	 * "come back later" is actionable while "expired" is not. Everything else —
	 * unknown id, expired, already claimed, wrong or missing code — collapses into
	 * `unavailable`, so someone probing random ids learns nothing.
	 */
	type ClaimState = 'loading' | 'preview' | 'review' | 'claimed' | 'unavailable' | 'uncovered';

	let claimState = $state<ClaimState>('loading');
	let preview = $state<PublicTip | undefined>();
	let details = $state<TipDetails | undefined>();
	let busy = $state(false);
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
		details = undefined;
		claimState = 'unavailable';
	};

	const isUncovered = (err: unknown): boolean =>
		typeof err === 'object' && err !== null && 'Uncovered' in err;

	const load = async () => {
		const code = claimCode();

		if (isNullish(code)) {
			// A link that lost its fragment cannot be claimed by anyone, so it is
			// indistinguishable from a tip that no longer exists.
			toUnavailable();
			return;
		}

		try {
			if (nonNullish($authIdentity)) {
				details = await loadTipDetails({ identity: $authIdentity, tipId, claimCode: code });
				claimState = 'review';
				void loadTokenMetadata(details.ledger_canister_id);
				return;
			}

			preview = await loadTipPreview({ tipId });
			claimState = 'preview';
			void loadTokenMetadata(preview.ledger_canister_id);
		} catch (_: unknown) {
			toUnavailable();
		}
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
			// Non-fatal: the amount falls back to base units rather than blocking a
			// claim over a cosmetic lookup.
		}
	};

	onMount(load);

	// Signing in happens in a popup, so this component stays mounted and simply
	// re-loads as the identity appears — no round-trip through a URL.
	$effect(() => {
		if (nonNullish($authIdentity) && claimState === 'preview') {
			void load();
		}
	});

	const handleClaim = async () => {
		const code = claimCode();

		if (isNullish($authIdentity) || isNullish(code)) {
			return;
		}

		busy = true;

		try {
			await claimTip({ identity: $authIdentity, tipId, claimCode: code });
			claimState = 'claimed';
		} catch (err: unknown) {
			if (isUncovered(err)) {
				claimState = 'uncovered';
			} else {
				// A failed claim transferred nothing, so the tip stays claimable and a
				// retry is the right advice.
				toastsError({ msg: { text: $i18n.tip.text.claim_failed }, err });
			}
		} finally {
			busy = false;
		}
	};

	const toWallet = async () => await goto(AppPath.Tokens);

	let amountLabel = $derived.by(() => {
		const value = details?.amount ?? preview?.amount;

		if (isNullish(value)) {
			return undefined;
		}

		return nonNullish(decimals) && nonNullish(symbol)
			? `${formatToken({ value, unitName: decimals, displayDecimals: decimals })} ${symbol}`
			: `${value}`;
	});

	let expiresAt = $derived.by(() => {
		const ns = details?.expires_at_ns ?? preview?.expires_at_ns;
		return nonNullish(ns) ? new Date(Number(ns / 1_000_000n)).toLocaleString() : undefined;
	});
</script>

{#if claimState !== 'loading'}
	{#if claimState === 'preview'}
		<TipClaimHero {logo} {symbol} />

		<h1 class="mb-3 text-center text-xl">
			{replacePlaceholders($i18n.tip.text.claim_ready_title, { $amount: amountLabel ?? '' })}
		</h1>

		<p class="mb-2 text-center text-tertiary">{$i18n.tip.text.claim_ready_description}</p>

		{#if nonNullish(expiresAt)}
			<p class="mb-6 text-center text-sm text-tertiary">
				{replacePlaceholders($i18n.tip.text.claim_expires, { $date: expiresAt })}
			</p>
		{/if}

		<!--
			The same sign-in block as the landing page, deliberately: this page is the
			feature's cold-start funnel, so it must offer every provider the landing
			page does — not a reduced one — and it carries the terms line with it.
		-->
		<ButtonAuthenticateWithHelp fullWidth helpAlignment="center" needHelpLink={false} />
	{:else if claimState === 'review' && nonNullish(details)}
		<div
			class="mb-6 flex flex-col items-center rounded-2xl bg-brand-subtle-10 px-4 py-6 text-center"
		>
			<Logo alt={symbol ?? ''} size="lg" src={logo} />

			<p class="mt-3 text-tertiary">{$i18n.tip.text.claim_received}</p>

			<p class="text-3xl font-bold">{amountLabel}</p>
		</div>

		{#if nonNullish(details.message[0])}
			<p class="mb-6 text-center italic">“{details.message[0]}”</p>
		{/if}

		<div class="mb-6">
			<ModalValue>
				{#snippet label()}{$i18n.tip.text.claim_to}{/snippet}
				{#snippet mainValue()}{$i18n.tip.text.claim_to_value}{/snippet}
			</ModalValue>

			{#if nonNullish(symbol)}
				<ModalValue>
					{#snippet label()}{$i18n.tip.text.claim_token}{/snippet}
					{#snippet mainValue()}{symbol}{/snippet}
				</ModalValue>
			{/if}

			<ModalValue>
				{#snippet label()}{$i18n.tip.text.claim_status}{/snippet}
				{#snippet mainValue()}{$i18n.tip.text.claim_status_reserved}{/snippet}
			</ModalValue>

			{#if nonNullish(expiresAt)}
				<ModalValue>
					{#snippet label()}{$i18n.tip.text.expiration}{/snippet}
					{#snippet mainValue()}{expiresAt}{/snippet}
				</ModalValue>
			{/if}
		</div>

		<p class="mb-6 text-sm text-tertiary">{$i18n.tip.text.claimer_disclosure}</p>

		<Button disabled={busy} fullWidth onclick={handleClaim} testId={TIP_CLAIM_BUTTON}>
			{$i18n.tip.text.claim_now}
		</Button>
	{:else if claimState === 'claimed'}
		<TipClaimHero {logo} {symbol} />

		<h1 class="mb-3 text-center text-xl">{$i18n.tip.text.claimed_title}</h1>

		<p class="mb-6 text-center text-tertiary">{$i18n.tip.text.claimed_description}</p>

		<Button fullWidth onclick={toWallet}>{$i18n.tip.text.take_me_to_wallet}</Button>
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
