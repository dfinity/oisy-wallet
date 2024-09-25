<script lang="ts">
	import type { Icrc1TransferRequest } from '@dfinity/ledger-icp';
	import { IcpWallet } from '@dfinity/oisy-wallet-signer/icp-wallet';
	import { isNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';

	let wallet: IcpWallet | undefined;

	const onClick = async () => {
		try {
			if (isNullish($authIdentity)) {
				await nullishSignOut();
				return;
			}

			const {
				location: { href }
			} = window;

			wallet = await IcpWallet.connect({
				url: `${href}sign`
			});

			const accounts = await wallet?.accounts();

			const account = accounts?.[0];

			if (isNullish(account)) {
				toastsError({
					msg: { text: 'The wallet did not provide any account.' }
				});
				return;
			}

			const E8S_PER_ICP = 100_000_000n;

			const request: Icrc1TransferRequest = {
				to: {
					owner: $authIdentity.getPrincipal(),
					subaccount: []
				},
				amount: 1n * (E8S_PER_ICP / 20n)
			};

			await wallet?.icrc1Transfer({
				owner: account.owner,
				request
			});

			toastsShow({
				text: 'It worked out! 🥳',
				level: 'info',
				duration: 4000
			});
		} catch (err: unknown) {
			toastsError({
				msg: { text: 'Something went wrong!' },
				err
			});
		}
	};

	onDestroy(() => wallet?.disconnect());
</script>

<ButtonMenu ariaLabel="Test signer standard by requesting 1 ICP" on:click={onClick}
	>Request (from yourself) 0.05 ICP</ButtonMenu
>
