<script lang="ts">
	import type { IcToken } from '$icp/types/ic';
	import { token } from '$lib/derived/token.derived';
	import IconSync from '$lib/components/icons/IconSync.svelte';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { updateBalance } from '$icp/services/ckbtc.services';
	import { authStore } from '$lib/stores/auth.store';
	import { ProgressStepsUpdateBalanceCkBtc } from '$lib/enums/progress-steps';
	import { Modal } from '@dfinity/gix-components';
	import { modalStore } from '$lib/stores/modal.store';
	import { modalReceiveBitcoin } from '$lib/derived/modal.derived';
	import IcReceiveBitcoinProgress from '$icp/components/receive/IcReceiveBitcoinProgress.svelte';
	import { MinterAlreadyProcessingError, MinterNoNewUtxosError } from '@dfinity/ckbtc';
	import type { SyncState } from '$lib/types/sync';
	import { blur } from 'svelte/transition';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';

	let receiveProgressStep: string | undefined = undefined;

	const receive = async () => {
		receiveProgressStep = ProgressStepsUpdateBalanceCkBtc.INITIALIZATION;

		modalStore.openReceiveBitcoin();

		try {
			await updateBalance({
				token: $token as IcToken,
				identity: $authStore.identity,
				progress: (step: ProgressStepsUpdateBalanceCkBtc) => (receiveProgressStep = step)
			});

			receiveProgressStep = ProgressStepsUpdateBalanceCkBtc.DONE;

			setTimeout(() => modalStore.close(), 750);
		} catch (err: unknown) {
			if (err instanceof MinterNoNewUtxosError) {
				toastsShow({
					text: $i18n.receive.bitcoin.info.no_new_btc,
					level: 'info',
					duration: 2000
				});

				modalStore.close();
				return;
			}

			if (err instanceof MinterAlreadyProcessingError) {
				toastsShow({
					text: $i18n.receive.bitcoin.info.check_btc_progress,
					level: 'info',
					duration: 2000
				});

				modalStore.close();
				return;
			}

			toastsError({
				msg: { text: $i18n.receive.bitcoin.error.unexpected_btc },
				err
			});

			modalStore.close();
		}
	};

	let ckBtcUpdateBalanceSyncState: SyncState | undefined = undefined;
	const debounceUpdateSyncState = debounce(
		(state: SyncState) => (ckBtcUpdateBalanceSyncState = state)
	);
	const onSyncState = ({ detail: state }: CustomEvent<SyncState>) => debounceUpdateSyncState(state);
</script>

<svelte:window on:oisyCkBtcUpdateBalance={onSyncState} />

{#if nonNullish(ckBtcUpdateBalanceSyncState)}
	{#if ckBtcUpdateBalanceSyncState === 'in_progress'}<div class="text-misty-rose animate-pulse">
			<span in:blur>{$i18n.receive.bitcoin.text.checking_status}</span>
		</div>{:else}
		<button
			in:blur
			class="text text-blue border-0 flex gap-2"
			on:click={async () => await receive()}><IconSync /> {$i18n.core.text.refresh}</button
		>
	{/if}
{/if}

{#if $modalReceiveBitcoin}
	<Modal on:nnsClose={modalStore.close} disablePointerEvents={true}>
		<svelte:fragment slot="title">{$i18n.receive.bitcoin.text.refresh_status}</svelte:fragment>

		<div class="stretch">
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
