<script lang="ts">
	import { IconWallet } from '@dfinity/gix-components';
	import {
		ICRC25_PERMISSION_GRANTED,
		ICRC27_ACCOUNTS,
		type IcrcScope,
		type IcrcScopedMethod,
		type PermissionsConfirmation
	} from '@dfinity/oisy-wallet-signer';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type Component, getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import IconShield from '$lib/components/icons/IconShield.svelte';
	import SignerOrigin from '$lib/components/signer/SignerOrigin.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const {
		permissionsPrompt: { payload, reset: resetPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	let scopes: IcrcScope[];
	$: scopes = $payload?.requestedScopes ?? [];

	let confirm: PermissionsConfirmation | undefined;
	$: confirm = $payload?.confirm;

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

		confirm(scopes.map((scope) => ({ ...scope, state: ICRC25_PERMISSION_GRANTED })));

		resetPrompt();
	};

	const onReject = () => ignorePermissions();

	const onApprove = () => approvePermissions();

	let listItems: Record<IcrcScopedMethod, { icon: Component; label: string }>;
	$: listItems = {
		icrc27_accounts: {
			icon: IconWallet,
			label: replaceOisyPlaceholders($i18n.signer.permissions.text.icrc27_accounts)
		},
		icrc49_call_canister: {
			icon: IconShield,
			label: $i18n.signer.permissions.text.icrc49_call_canister
		}
	};

	let requestAccountsPermissions = false;
	$: requestAccountsPermissions = nonNullish(
		scopes.find(({ scope: { method } }) => method === ICRC27_ACCOUNTS)
	);
</script>

{#if nonNullish($payload)}
	<form method="POST" on:submit={onApprove} in:fade>
		<h2 class="mb-4 text-center">{$i18n.signer.permissions.text.title}</h2>

		<SignerOrigin payload={$payload} />

		<div class="mb-6 rounded-lg border border-brand-subtle-10 bg-brand-subtle-20 p-6">
			<p class="break-normal font-bold">{$i18n.signer.permissions.text.requested_permissions}</p>

			<ul class="mt-2.5 flex list-none flex-col gap-1">
				{#each scopes as { scope: { method } } (method)}
					{@const { icon, label } = listItems[method]}

					<li class="flex items-center gap-2 break-normal pb-1.5">
						<svelte:component this={icon} size="24" />
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
