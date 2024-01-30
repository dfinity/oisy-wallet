<script lang="ts">
	import type { IcToken } from '$icp/types/ic';
	import { token } from '$lib/derived/token.derived';
	import IconSync from '$lib/components/icons/IconSync.svelte';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { updateBalance } from '$icp/services/ckbtc.services';
	import { authStore } from '$lib/stores/auth.store';
	import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
	import { Modal } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { modalReceiveBitcoin } from '$lib/derived/modal.derived';
	import IcReceiveBitcoinProgress from '$icp/components/receive/IcReceiveBitcoinProgress.svelte';
	import { MinterNoNewUtxosError } from '@dfinity/ckbtc';
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';

	let ckBTC = false;
	$: ckBTC = $tokenCkBtcLedger;

	/**
	 * Update balance / receive Bitcoin
	 */

	let receiveProgressStep: string | undefined = undefined;

	const receive = async () => {
		receiveProgressStep = UpdateBalanceCkBtcStep.INITIALIZATION;

		modalStore.openReceiveBitcoin();

		try {
			await updateBalance({
				token: $token as IcToken,
				identity: $authStore.identity,
				progress: (step: UpdateBalanceCkBtcStep) => (receiveProgressStep = step)
			});

			receiveProgressStep = UpdateBalanceCkBtcStep.DONE;

			setTimeout(() => modalStore.close(), 750);
		} catch (err: unknown) {
			if (err instanceof MinterNoNewUtxosError) {
				toastsShow({
					text: 'No new confirmed BTC.',
					level: 'info',
					duration: 2000
				});

				modalStore.close();
				return;
			}

			toastsError({
				msg: { text: `Something went wrong while checking for incoming BTC.` },
				err
			});

			modalStore.close();
		}
	};
</script>

{#if ckBTC}
	<button class="text text-blue" on:click={async () => await receive()}
		><IconSync /> Check for incoming BTC</button
	>
{/if}

{#if $modalReceiveBitcoin}
	<Modal on:nnsClose={modalStore.close} disablePointerEvents={true}>
		<svelte:fragment slot="title">Check for incoming BTC</svelte:fragment>

		<div>
			<IcReceiveBitcoinProgress bind:receiveProgressStep />
		</div>
	</Modal>
{/if}

<style lang="scss">
	button {
		&:hover,
		&:active {
			color: var(--color-dark-blue);
		}
	}
</style>
