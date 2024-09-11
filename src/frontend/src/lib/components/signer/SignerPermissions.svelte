<script lang="ts">
	import {
		type IcrcScope,
		type IcrcScopedMethod,
		type PermissionsConfirmation
	} from '@dfinity/oisy-wallet-signer';
	import { nonNullish } from '@dfinity/utils';
	import { type ComponentType, getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { IconWallet } from '@dfinity/gix-components';
	import IconShield from '$lib/components/icons/IconShield.svelte';

	const {
		permissionsPrompt: { payload, reset: resetPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	let scopes: IcrcScope[] | undefined;
	$: scopes = $payload?.requestedScopes;

	let confirm: PermissionsConfirmation | undefined;
	$: confirm = $payload?.confirmScopes;

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

{#if nonNullish(scopes)}
	<form in:fade on:submit|preventDefault={onApprove} method="POST">
		<h2 class="text-center mb-6">Connect your wallet</h2>

		<div class="bg-light-blue p-6 mb-6 rounded-lg">
			<p class="break-normal font-bold">By connecting, ORIGIN will:</p>

			<ul class="flex flex-col gap-1 list-none mt-2.5">
				{#each scopes as scope}
					{@const {icon, label} = listItems[scope.scope.method]}

					<li class="break-normal pb-1.5 flex items-center gap-2">
						<svelte:component this={icon} /> {label}
					</li>
				{/each}
			</ul>
		</div>

		<ButtonGroup>
			<button type="button" class="secondary block flex-1" on:click={onReject}>Reject</button>
			<button type="submit" class="primary block flex-1">Approve</button>
		</ButtonGroup>
	</form>
{/if}
