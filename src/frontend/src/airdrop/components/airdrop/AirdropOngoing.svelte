<script lang="ts">
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import AirdropInvites from '$airdrop/components/airdrop/AirdropInvites.svelte';
	import type { Info } from '$declarations/airdrop/airdrop.did';
	import type { StaticStep } from '$lib/types/steps';
	import { fromNullable } from '@dfinity/utils';
	import {
		allAirdropInvitesRedeemed,
		hasAirdropInvites,
		isAirdropTransferred
	} from '$airdrop/utils/airdrop.utils';
	import { AirdropStep } from '$lib/enums/steps';

	export let airdrop: Info;

	let steps: [StaticStep, ...StaticStep[]] = [
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

<div class="my-2"><InProgress {progressStep} {steps} type="static" /></div>

<AirdropInvites {airdrop} />
