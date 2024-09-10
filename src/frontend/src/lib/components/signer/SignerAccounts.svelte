<script lang="ts">
	import { IconWallet } from '@dfinity/gix-components';
	import type { AccountsConfirmation } from '@dfinity/oisy-wallet-signer';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SIGNER_CONTEXT_KEY, type SignerContext } from '$lib/stores/signer.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	const {
		accountsPrompt: { payload, reset: resetPrompt }
	} = getContext<SignerContext>(SIGNER_CONTEXT_KEY);

	let confirm: AccountsConfirmation | undefined;
	$: confirm = $payload?.confirmAccounts;

	const onReject = () => {
		resetPrompt();
	};

	const onApprove = () => {
		// TODO: assert no undefined and toast error
		if (isNullish($authIdentity)) {
			return;
		}

		confirm?.([{ owner: $authIdentity.getPrincipal().toText() }]);

		resetPrompt();
	};
</script>

{#if nonNullish(confirm)}
	<form in:fade on:submit|preventDefault={onApprove} method="POST">
		<h2 class="text-center mb-6">Share account</h2>

		<div class="bg-light-blue p-6 mb-6 rounded-lg">
			<p class="break-normal font-bold">By connecting, the dApp will:</p>

			<p class="break-normal pt-2.5 flex items-center gap-2">
				<IconWallet /> Learn your Oisy wallet address
			</p>

			<p class="break-normal pt-2.5 flex items-center gap-2">
				<IconWallet /> Initiate transaction to approve in Oisy
			</p>
		</div>

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

		<ButtonGroup>
			<button type="button" class="secondary block flex-1" on:click={onReject}>Reject</button>
			<button type="submit" class="primary block flex-1">Approve</button>
		</ButtonGroup>
	</form>
{/if}
