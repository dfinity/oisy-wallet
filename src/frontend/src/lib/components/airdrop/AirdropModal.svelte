<script lang="ts">
	import { modalAirdrop } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { Modal, type ProgressStep } from '@dfinity/gix-components';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { AirdropStep } from '$lib/enums/airdrop';
	import type { StaticStep } from '$lib/types/steps';
	import AirdropInvites from '$lib/components/airdrop/AirdropInvites.svelte';
	import type { Info } from '$declarations/airdrop/airdrop.did';
	import { fromNullable } from '@dfinity/utils';
	import {
		allAirdropInvitesRedeemed,
		hasAirdropInvites,
		isAirdropTransferred
	} from '$lib/utils/airdrop.utils';

	export let airdrop: Info;

	let steps: [ProgressStep, ...ProgressStep[]] = [
		{
			step: AirdropStep.INITIALIZATION,
			text: 'You’ve created a wallet',
			state: 'completed'
		} as StaticStep,
		{
			step: AirdropStep.AIRDROP,
			text: 'Airdropped 2 ICP for you',
			state: 'in_progress',
			progressLabel: 'In progress, may take a while'
		} as StaticStep,
		...((fromNullable(airdrop?.children)?.length ?? 0) > 0
			? [
					{
						step: AirdropStep.INVITE_FRIENDS,
						text: `Earn up to 6 ICP by inviting friends!`,
						state: 'next'
					} as StaticStep
			  ]
			: [])
	];

	let hasInvites = false;
	$: hasInvites = hasAirdropInvites(airdrop);

	let allInvitesRedeemed = false;
	$: allInvitesRedeemed = allAirdropInvitesRedeemed(airdrop);

	let progressStep: string = AirdropStep.AIRDROP;
	$: progressStep = isAirdropTransferred(airdrop)
		? allInvitesRedeemed || !hasInvites
			? AirdropStep.DONE
			: AirdropStep.INVITE_FRIENDS
		: AirdropStep.AIRDROP;
</script>

<Modal visible={$modalAirdrop} on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">AirDrop status</svelte:fragment>

	<div class="my-2"><InProgress {progressStep} {steps} type="static" /></div>

	<AirdropInvites {airdrop} />
</Modal>
