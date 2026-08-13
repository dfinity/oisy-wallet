<script lang="ts">
	import { ICRC25_PERMISSION_GRANTED, ICRC27_ACCOUNTS } from '@dfinity/oisy-wallet-signer';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import IconGixWallet from '$lib/components/icons/IconGixWallet.svelte';
	import IconShield from '$lib/components/icons/IconShield.svelte';
	import IconAstronautHelmet from '$lib/components/icons/icon-astronaut/IconAstronautHelmet.svelte';
	import SignerOrigin from '$lib/components/signer/SignerOrigin.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_SIGNER,
		PLAUSIBLE_EVENT_TYPES_SIGNER,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { mapSignerOriginHost } from '$lib/utils/signer.utils';

	const {
		permissionsPrompt: { payload, reset: resetPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	let scopes = $derived($payload?.requestedScopes ?? []);

	let confirm = $derived($payload?.confirm);

	const signerEventMetadata = $derived({
		event_context: PLAUSIBLE_EVENT_CONTEXTS.SIGNER,
		event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_SIGNER.PERMISSIONS,
		dapp_origin: mapSignerOriginHost($payload?.origin),
		scopes: scopes.map(({ scope: { method } }) => method).join(',')
	});

	$effect(() => {
		if (nonNullish($payload)) {
			trackEvent({
				name: PLAUSIBLE_EVENTS.SIGNER_INTERACTION,
				metadata: {
					...signerEventMetadata,
					event_type: PLAUSIBLE_EVENT_TYPES_SIGNER.REQUESTED
				}
			});
		}
	});

	/**
	 * During the initial UX review, it was decided that permissions should not be permanently denied when "Rejected," but instead should be ignored.
	 * This means that if the user selects "Reject," the permission will be requested again the next time a similar action is performed.
	 * This approach is particularly useful since, for the time being, there is no way for the user to manage their permissions in the Oisy UI.
	 */
	const ignorePermissions = () => {
		if (isNullish(confirm)) {
			toastsError({
				msg: { text: $i18n.signer.permissions.error.no_confirm_callback }
			});
			return;
		}

		trackEvent({
			name: PLAUSIBLE_EVENTS.SIGNER_INTERACTION,
			metadata: {
				...signerEventMetadata,
				result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.CANCEL
			}
		});

		confirm([]);

		resetPrompt();
	};

	const approvePermissions = () => {
		if (isNullish(confirm)) {
			toastsError({
				msg: { text: $i18n.signer.permissions.error.no_confirm_callback }
			});
			return;
		}

		trackEvent({
			name: PLAUSIBLE_EVENTS.SIGNER_INTERACTION,
			metadata: {
				...signerEventMetadata,
				result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			}
		});

		confirm(scopes.map((scope) => ({ ...scope, state: ICRC25_PERMISSION_GRANTED })));

		resetPrompt();
	};

	const onReject = () => ignorePermissions();

	const onApprove = () => approvePermissions();

	let listItems = $derived({
		icrc27_accounts: {
			icon: IconGixWallet,
			label: replaceOisyPlaceholders($i18n.signer.permissions.text.icrc27_accounts)
		},
		icrc49_call_canister: {
			icon: IconShield,
			label: $i18n.signer.permissions.text.icrc49_call_canister
		}
	});

	let requestAccountsPermissions = $derived(
		nonNullish(scopes.find(({ scope: { method } }) => method === ICRC27_ACCOUNTS))
	);
</script>

{#if nonNullish($payload)}
	<form method="POST" onsubmit={onApprove} in:fade>
		<h2 class="mb-4 text-center">{$i18n.signer.permissions.text.title}</h2>

		<SignerOrigin payload={$payload} />

		<div class="mb-6 rounded-lg border border-brand-subtle-10 bg-brand-subtle-20 p-6">
			<p class="font-bold break-normal">{$i18n.signer.permissions.text.requested_permissions}</p>

			<ul class="mt-2.5 flex list-none flex-col gap-1">
				{#each scopes as { scope: { method } } (method)}
					{@const { icon: Icon, label } = listItems[method]}

					<li class="flex items-center gap-2 pb-1.5 break-normal">
						<Icon size="24" />
						{label}
					</li>
				{/each}
			</ul>
		</div>

		{#if requestAccountsPermissions}
			<div class="mb-10 flex gap-4 rounded-lg border border-secondary-inverted bg-primary p-4">
				<IconAstronautHelmet />

				<div>
					<label class="block text-sm font-bold" for="ic-wallet-address"
						>{$i18n.signer.permissions.text.your_wallet_address}</label
					>

					<output id="ic-wallet-address" class="break-all"
						>{shortenWithMiddleEllipsis({ text: $icrcAccountIdentifierText ?? '' })}</output
					>
				</div>
			</div>
		{/if}

		<ButtonGroup>
			<Button colorStyle="error" onclick={onReject}>
				{$i18n.core.text.reject}
			</Button>
			<Button colorStyle="success" type="submit">
				{$i18n.core.text.approve}
			</Button>
		</ButtonGroup>
	</form>
{/if}
