<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { PublicTip, TipDetails } from '$declarations/backend/backend.did';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { TIP_CLAIM_BUTTON, TIP_CLAIM_SIGN_IN_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { signIn } from '$lib/services/auth.services';
	import {
		claimTip,
		loadTipDetails,
		loadTipPreview,
		parseClaimCodeFromFragment
	} from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { InternetIdentityDomain } from '$lib/types/auth';
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
				return;
			}

			preview = await loadTipPreview({ tipId });
			claimState = 'preview';
		} catch (_: unknown) {
			toUnavailable();
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

	const handleSignIn = async () => {
		await signIn({ domain: InternetIdentityDomain.VERSION_2_0 });
	};

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

	let expiresAt = $derived.by(() => {
		const ns = details?.expires_at_ns ?? preview?.expires_at_ns;
		return nonNullish(ns) ? new Date(Number(ns / 1_000_000n)).toLocaleString() : undefined;
	});
</script>

{#if claimState !== 'loading'}
	<Modal onClose={toWallet}>
		{#snippet title()}
			<span class="text-xl">
				{claimState === 'preview' ? $i18n.tip.text.status_title : $i18n.tip.text.claim_title}
			</span>
		{/snippet}

		<ContentWithToolbar>
			{#if claimState === 'preview' && nonNullish(preview)}
				<p class="text-tertiary">{$i18n.tip.text.claim_amount}</p>

				<p class="mb-4 text-3xl font-bold">{preview.amount}</p>

				{#if nonNullish(expiresAt)}
					<p class="mb-4 text-sm text-tertiary">
						{replacePlaceholders($i18n.tip.text.claim_expires, { $date: expiresAt })}
					</p>
				{/if}

				<p class="text-tertiary">{$i18n.tip.text.open_or_create_hint}</p>
			{:else if claimState === 'review' && nonNullish(details)}
				<p class="text-tertiary">{$i18n.tip.text.claim_amount}</p>

				<p class="mb-4 text-3xl font-bold">{details.amount}</p>

				{#if nonNullish(details.message[0])}
					<p class="mb-4 italic">“{details.message[0]}”</p>
				{/if}

				{#if nonNullish(expiresAt)}
					<p class="mb-4 text-sm text-tertiary">
						{replacePlaceholders($i18n.tip.text.claim_expires, { $date: expiresAt })}
					</p>
				{/if}

				<p class="text-sm text-tertiary">{$i18n.tip.text.claimer_disclosure}</p>
			{:else if claimState === 'claimed'}
				<h3 class="mb-2">{$i18n.tip.text.claimed_title}</h3>

				<p class="text-tertiary">{$i18n.tip.text.claimed_description}</p>
			{:else if claimState === 'uncovered'}
				<MessageBox level="warning">
					<h3 class="mb-2">{$i18n.tip.text.uncovered_title}</h3>

					<p>{$i18n.tip.text.uncovered_description}</p>
				</MessageBox>
			{:else}
				<h3 class="mb-2">{$i18n.tip.text.unavailable_title}</h3>

				<p class="text-tertiary">{$i18n.tip.text.unavailable_description}</p>
			{/if}

			{#snippet toolbar()}
				{#if claimState === 'preview'}
					<Button fullWidth onclick={handleSignIn} testId={TIP_CLAIM_SIGN_IN_BUTTON}>
						{$i18n.tip.text.open_or_create}
					</Button>
				{:else if claimState === 'review'}
					<Button disabled={busy} fullWidth onclick={handleClaim} testId={TIP_CLAIM_BUTTON}>
						{$i18n.tip.text.claim_now}
					</Button>
				{:else}
					<Button fullWidth onclick={toWallet}>{$i18n.tip.text.take_me_to_wallet}</Button>
				{/if}
			{/snippet}
		</ContentWithToolbar>
	</Modal>
{/if}
