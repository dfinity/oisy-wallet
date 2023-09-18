<script lang="ts">
	import { modalAirdrop } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { Modal, type ProgressStep } from '@dfinity/gix-components';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { AirdropStep } from '$lib/enums/airdrop';

	let progressStep: string = AirdropStep.AIRDROP;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: AirdropStep.INITIALIZATION,
			text: 'You’ve created a wallet',
			state: 'completed'
		} as ProgressStep,
		{
			step: AirdropStep.AIRDROP,
			text: 'Airdropped 1 ICP for you',
			state: 'in_progress'
		} as ProgressStep,
		{
			step: AirdropStep.INVITE_FRIENDS,
			text: `Earn an extra 2 ICP for every friend invited!`,
			state: 'next'
		} as ProgressStep
	];
</script>

<Modal visible={$modalAirdrop} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">Airdrop status</svelte:fragment>

	<InProgress {progressStep} {steps} />
</Modal>
