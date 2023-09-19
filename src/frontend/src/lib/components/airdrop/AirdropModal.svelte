<script lang="ts">
	import { modalAirdrop } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { Modal, type ProgressStep } from '@dfinity/gix-components';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { AirdropStep } from '$lib/enums/airdrop';
	import type { StaticStep } from '$lib/types/steps';

	let progressStep: string = AirdropStep.AIRDROP;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: AirdropStep.INITIALIZATION,
			text: 'You’ve created a wallet',
			state: 'completed'
		} as StaticStep,
		{
			step: AirdropStep.AIRDROP,
			text: 'Airdropped 1 ICP for you',
			state: 'in_progress',
			stateLabel: 'In progress, may take a while'
		} as StaticStep,
		{
			step: AirdropStep.INVITE_FRIENDS,
			text: `Earn an extra 2 ICP for every friend invited!`,
			state: 'next'
		} as StaticStep
	];
</script>

<Modal visible={$modalAirdrop} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">AirDrop status</svelte:fragment>

	<div class="my-2"><InProgress {progressStep} {steps} type="static" /></div>
</Modal>
