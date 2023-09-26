<script lang="ts">
	import type { Info } from '$declarations/airdrop/airdrop.did';
	import { AirdropStep } from '$lib/enums/airdrop';
	import type { StaticStep } from '$lib/types/steps';
	import { countAirdropInvitesRedeemed } from '$lib/utils/airdrop.utils';
	import StaticSteps from "$lib/components/ui/StaticSteps.svelte";

	export let airdrop: Info;

	let steps: [StaticStep, ...StaticStep[]];
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
		...(!airdrop.tokens_transferred && countInvitesRedeemed === 0
			? [
					{
						step: AirdropStep.AIRDROP,
						text: 'Airdrop is unfortunately completed',
						state: 'skipped'
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
</script>

<div class="my-2"><StaticSteps {steps} /></div>

<p class="mt-4 mb-2">
	<small>The airdrop is completed. All rewards have been distributed.</small>
</p>
