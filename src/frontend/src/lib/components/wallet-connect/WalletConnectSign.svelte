<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { Modal } from '@dfinity/gix-components';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { convertHexToUtf8, getSignParamsMessage } from '$lib/utils/wallet-connect.utils';
	import { busy } from '$lib/stores/busy.store';
	import type { WalletConnectListener } from '$lib/types/wallet-connect';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalWalletConnectSign } from '$lib/derived/modal.derived';

	export let listener: WalletConnectListener | undefined | null;

	let request: Web3WalletTypes.SessionRequest | undefined;
	$: request = $modalStore?.data as Web3WalletTypes.SessionRequest | undefined;

	const close = () => modalStore.close();

	type CallBackParams = {
		request: Web3WalletTypes.SessionRequest;
		listener: WalletConnectListener;
	};

	const reject = async () =>
		await execute({
			callback: async ({ request, listener }: CallBackParams) => {
				const { id, topic } = request;

				await listener.rejectRequest({ topic, id });
			},
			toastMsg: 'WalletConnect request rejected.'
		});

	const approve = async () =>
		await execute({
			callback: async ({ request, listener }: CallBackParams) => {
				const {
					id,
					topic,
					params: {
						request: { params }
					}
				} = request;

				const message = convertHexToUtf8(params);

				// TODO: sign message
				// const signedMessage = await wallet.signMessage(message)

				// TODO: approve request

				// TODO: to be removed
				await listener.rejectRequest({ topic, id });
			},
			toastMsg: 'WalletConnect request approved.'
		});

	const execute = async ({
		callback,
		toastMsg
	}: {
		callback: (params: CallBackParams) => Promise<void>;
		toastMsg: string;
	}) => {
		if (isNullish(listener)) {
			toastsError({
				msg: { text: `Unexpected error: No connection opened.` }
			});

			close();
			return;
		}

		if (isNullish(request)) {
			toastsError({
				msg: { text: `Unexpected error: Request is not defined therefore cannot be processed.` }
			});

			close();
			return;
		}

		busy.start();

		try {
			await callback({ request, listener });

			toastsShow({
				text: toastMsg,
				level: 'info',
				duration: 2000
			});
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Unexpected error while processing the request with WalletConnect.` },
				err
			});
		}

		busy.stop();

		close();
	};
</script>

{#if $modalWalletConnectSign && nonNullish(request)}
	<Modal on:nnsClose={reject}>
		<svelte:fragment slot="title">Sign Message</svelte:fragment>

		<p class="font-bold">Message</p>
		<p class="mb-2 font-normal">
			<output class="break-words">{getSignParamsMessage(request.params.request.params)}</output>
		</p>

		<p class="font-bold">Method</p>
		<p class="mb-2 font-normal">
			{request.params.request.method}
		</p>

		<div class="flex justify-end gap-1 mt-4">
			<button class="primary" on:click={reject} disabled={$isBusy}>Reject</button>
			<button class="primary" on:click={approve} disabled={$isBusy}> Approve </button>
		</div>
	</Modal>
{/if}
