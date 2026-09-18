<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy, onMount, setContext } from 'svelte';
	import { fade, type FadeParams } from 'svelte/transition';
	import AgreementsGuard from '$lib/components/guard/AgreementsGuard.svelte';
	import LoaderUserProfile from '$lib/components/loaders/LoaderUserProfile.svelte';
	import SignerAccounts from '$lib/components/signer/SignerAccounts.svelte';
	import SignerCallCanister from '$lib/components/signer/SignerCallCanister.svelte';
	import SignerConsentMessage from '$lib/components/signer/SignerConsentMessage.svelte';
	import SignerIdle from '$lib/components/signer/SignerIdle.svelte';
	import SignerPermissions from '$lib/components/signer/SignerPermissions.svelte';
	import SignerSignIn from '$lib/components/signer/SignerSignIn.svelte';
	import { SIGNER_TARGET } from '$lib/constants/app.constants';
	import { MOBILE_APP_SIGNER_ENABLED } from '$lib/constants/mobile-flags.constants';
	import { authNotSignedIn, authIdentity } from '$lib/derived/auth.derived';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { initSignerContext, SIGNER_CONTEXT_KEY } from '$lib/stores/signer.store';
	import { isNativePlatform } from '$lib/utils/device.utils';
	import { gotoReplaceRoot } from '$lib/utils/nav.utils';

	const { idle, reset, ...context } = initSignerContext();
	setContext(SIGNER_CONTEXT_KEY, {
		...context,
		idle,
		reset
	});

	const init = () => {
		if (isNullish($authIdentity)) {
			reset();
			return;
		}

		context.init({ owner: $authIdentity });
	};

	onDestroy(reset);

	$effect(() => {
		[$authIdentity];
		init();
	});

	// We use specific fade parameters for the idle state due to the asynchronous communication between the relying party and the wallet.
	// Because the idle state might be displayed when a client starts communication with the wallet, we add a small delay to prevent a minor glitch where the idle animation is briefly shown before the actual action is rendered.
	// Technically, from a specification standpoint, we don't have a way to fully prevent this.
	const fadeParams: FadeParams = { delay: 150, duration: 250 };

	// The signer flow assumes a dapp-opened browser popup (`window.opener`,
	// ICRC-29 postMessage) — impossible inside the Capacitor shell. Redirect
	// to the wallet root instead of rendering a dead flow.
	const signerAvailable = !isNativePlatform() || MOBILE_APP_SIGNER_ENABLED;

	onMount(() => {
		if (!signerAvailable) {
			void gotoReplaceRoot();
			return;
		}

		trackEvent({
			name: PLAUSIBLE_EVENTS.SIGNER_PAGE_VISIT,
			metadata: {
				...(SIGNER_TARGET ? { signer_target: SIGNER_TARGET } : {})
			}
		});
	});
</script>

{#if signerAvailable}
	<article
		class="mb-2 flex min-h-96 flex-col rounded-lg border border-brand-subtle-20 bg-surface px-5 py-6"
	>
		{#if $authNotSignedIn}
			<SignerSignIn />
		{:else}
			<LoaderUserProfile>
				<SignerAccounts>
					{#if $idle}
						<div in:fade={fadeParams}>
							<SignerIdle />
						</div>
					{:else}
						<SignerPermissions />

						<SignerConsentMessage />

						<SignerCallCanister />
					{/if}
				</SignerAccounts>

				<AgreementsGuard />
			</LoaderUserProfile>
		{/if}
	</article>
{/if}
