<script lang="ts">
	import { IconWallet } from '@dfinity/gix-components';
	import {
		type IcrcScope,
		type IcrcScopedMethod,
		type PermissionsConfirmation
	} from '@dfinity/oisy-wallet-signer';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type ComponentType, getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import IconShield from '$lib/components/icons/IconShield.svelte';
	import SignerOrigin from '$lib/components/signer/SignerOrigin.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	const {
		permissionsPrompt: { payload, reset: resetPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	let scopes: IcrcScope[] | undefined;
	$: scopes = $payload?.requestedScopes;

	let confirm: PermissionsConfirmation | undefined;
	$: confirm = $payload?.confirm;

	const confirmPermissions = (state: 'denied' | 'granted') => {
		if (isNullish(confirm)) {
			toastsError({
				msg: { text: $i18n.signer.permissions.error.no_confirm_callback }
			});
			return;
		}

		confirm?.((scopes ?? []).map((scope) => ({ ...scope, state })));

		resetPrompt();
	};

	const onReject = () => confirmPermissions('denied');

	const onApprove = () => confirmPermissions('granted');

	const listItems: Record<
		IcrcScopedMethod,
		{
			icon: ComponentType;
			label: string;
		}
	> = {
		icrc27_accounts: {
			icon: IconWallet,
			label: $i18n.signer.permissions.text.icrc27_accounts
		},
		icrc49_call_canister: {
			icon: IconShield,
			label: $i18n.signer.permissions.text.icrc49_call_canister
		}
	};

	let requestAccountsPermissions = false;
	$: requestAccountsPermissions = nonNullish(
		scopes?.find(({ scope: { method } }) => method === 'icrc27_accounts')
	);
</script>

{#if nonNullish(scopes) && nonNullish($payload)}
	<form in:fade on:submit|preventDefault={onApprove} method="POST">
		<h2 class="text-center mb-4">{$i18n.signer.permissions.text.title}</h2>

		<SignerOrigin payload={$payload} />

		<div class="bg-light-blue border border-light-blue p-6 mb-6 rounded-lg">
			<p class="break-normal font-bold">{$i18n.signer.permissions.text.the_dapp_is_requesting}</p>

			<ul class="flex flex-col gap-1 list-none mt-2.5">
				{#each scopes as scope}
					{@const { icon, label } = listItems[scope.scope.method]}

					<li class="break-normal pb-1.5 flex items-center gap-2">
						<svelte:component this={icon} size="24" />
						{label}
					</li>
				{/each}
			</ul>
		</div>

		{#if requestAccountsPermissions}
			<div class="flex gap-4 border border-dust bg-white rounded-lg p-4 mb-10">
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
			<button type="button" class="secondary block flex-1" on:click={onReject}
				>{$i18n.core.text.reject}</button
			>
			<button type="submit" class="primary block flex-1">{$i18n.core.text.approve}</button>
		</ButtonGroup>
	</form>
{/if}
