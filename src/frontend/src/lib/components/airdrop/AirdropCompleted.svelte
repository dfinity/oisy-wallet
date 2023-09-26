<script lang="ts">
	import type { Info } from '$declarations/airdrop/airdrop.did';
	import type { ProgressStep } from '@dfinity/gix-components';
	import { AirdropStep } from '$lib/enums/airdrop';
	import type { StaticStep } from '$lib/types/steps';
	import { fromNullable } from '@dfinity/utils';
	import InProgress from '$lib/components/ui/InProgress.svelte';
	import { countAirdropInvitesRedeemed } from '$lib/utils/airdrop.utils';

	export let airdrop: Info;

	let steps: [ProgressStep, ...ProgressStep[]];
	$: steps = [
		{
			step: AirdropStep.INITIALIZATION,
			text: 'You’ve created a wallet',
			state: 'completed'
		} as StaticStep,
		...(airdrop.tokens_transferred
			? [
					{
						step: AirdropStep.AIRDROP,
						text: 'Airdropped 2 ICP for you',
						state: 'completed'
					} as StaticStep
			  ]
			: []),
		...(countInvitesRedeemed > 0
			? [
					{
						step: AirdropStep.INVITE_FRIENDS,
						text: `You earned ${countInvitesRedeemed * 2} ICP by inviting friends!`,
						state: 'completed'
					} as StaticStep
			  ]
			: [])
	];

	let countInvitesRedeemed = 0;
	$: countInvitesRedeemed = countAirdropInvitesRedeemed(airdrop);

	const progressStep: string = AirdropStep.DONE;
</script>

<div class="my-2"><InProgress {progressStep} {steps} type="static" /></div>

<p class="mt-4 mb-2">
	<small>The airdrop is completed. All rewards have been distributed.</small>
</p>
