<script lang="ts">
	import { IconWallet } from '@dfinity/gix-components';
	import {
		type IcrcScope,
		type IcrcScopedMethod,
		type Origin,
		type PermissionsConfirmation
	} from '@dfinity/oisy-wallet-signer';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type ComponentType, getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import IconShield from '$lib/components/icons/IconShield.svelte';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	const {
		permissionsPrompt: { payload, reset: resetPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	let scopes: IcrcScope[] | undefined;
	$: scopes = $payload?.requestedScopes;

	let confirm: PermissionsConfirmation | undefined;
	$: confirm = $payload?.confirmScopes;

	const hostOrigin = (origin: Origin | undefined): string | undefined => {
		if (isNullish(origin)) {
			return undefined;
		}

		try {
			// If set we actually for sure that the $payload.origin is a valid URL but, for the state of the art, we still catch potential errors here too.
			const { host } = new URL(origin);
			return host;
		} catch {
			return undefined;
		}
	};

	let origin: Origin | undefined;
	$: origin = hostOrigin($payload?.origin);

	const onReject = () => {
		// TODO: assert no undefined and toast error
		confirm?.((scopes ?? []).map((scope) => ({ ...scope, state: 'denied' })));

		resetPrompt();
	};

	const onApprove = () => {
		// TODO: assert no undefined and toast error
		confirm?.((scopes ?? []).map((scope) => ({ ...scope, state: 'granted' })));

		resetPrompt();
	};

	const listItems: Record<
		IcrcScopedMethod,
		{
			icon: ComponentType;
			label: string;
		}
	> = {
		icrc27_accounts: {
			icon: IconWallet,
			label: 'Learn your Oisy wallet address'
		},
		icrc49_call_canister: {
			icon: IconShield,
			label: 'Initiate transactions to approve in Oisy'
		}
	};
</script>

{#if nonNullish(scopes) && nonNullish(origin)}
	<form in:fade on:submit|preventDefault={onApprove} method="POST">
		<h2 class="text-center mb-6">Connect your wallet</h2>

		<div class="bg-light-blue p-6 mb-6 rounded-lg">
			<p class="break-normal font-bold">By connecting, {origin} will:</p>

			<ul class="flex flex-col gap-1 list-none mt-2.5">
				{#each scopes as scope}
					{@const { icon, label } = listItems[scope.scope.method]}

					<li class="break-normal pb-1.5 flex items-center gap-2">
						<svelte:component this={icon} />
						{label}
					</li>
				{/each}
			</ul>
		</div>

		{#if nonNullish(listItems['icrc27_accounts'])}
			<div class="border border-dust bg-white rounded-lg flex p-4 mb-6">
				<OisyWalletLogo />

				<div>
					<label class="block text-sm font-bold" for="ic-wallet-address"
						>{$i18n.wallet.text.wallet_address}:</label
					>

					<output id="ic-wallet-address" class="break-all"
						>{shortenWithMiddleEllipsis($icrcAccountIdentifierText ?? '')}</output
					>
				</div>
			</div>
		{/if}

		<ButtonGroup>
			<button type="button" class="secondary block flex-1" on:click={onReject}>Reject</button>
			<button type="submit" class="primary block flex-1">Approve</button>
		</ButtonGroup>
	</form>
{/if}
