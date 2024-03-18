<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { KeyValuePairInfo } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { authRemainingTimeStore, authStore } from '$lib/stores/auth.store';
	import { nonNullish } from '@dfinity/utils';
	import { secondsToDuration } from '@dfinity/utils';
	import type { Principal } from '@dfinity/principal';
	import TokensMetadata from '$lib/components/tokens/TokensMetadata.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import AdminAirdrop from '$airdrop/components/admin/AdminAirdrop.svelte';

	let remainingTimeMilliseconds: number | undefined;
	$: remainingTimeMilliseconds = $authRemainingTimeStore;

	let principal: Principal | undefined | null;
	$: principal = $authStore?.identity?.getPrincipal();
</script>

<KeyValuePairInfo>
	<svelte:fragment slot="key"><span class="font-bold">Your Principal:</span></svelte:fragment>
	<svelte:fragment slot="value"
		><output class="break-all">{shortenWithMiddleEllipsis(principal?.toText() ?? '')}</output><Copy
			inline
			value={principal?.toText() ?? ''}
			text="Principal copied to clipboard."
		/></svelte:fragment
	>
	<svelte:fragment slot="info">
		Your ID for the {OISY_NAME} Wallet. Created by your Internet Identity.
	</svelte:fragment>
</KeyValuePairInfo>

<div class="mt-4">
	<KeyValuePairInfo>
		<svelte:fragment slot="key"
			><span class="font-bold">Your session expires in:</span></svelte:fragment
		>
		<output slot="value" class="mr-1.5">
			{#if nonNullish(remainingTimeMilliseconds)}
				{remainingTimeMilliseconds <= 0
					? '0'
					: secondsToDuration({ seconds: BigInt(remainingTimeMilliseconds) / 1000n })}
			{/if}
		</output>

		<svelte:fragment slot="info">
			All sessions last 1 hour. After 1 hour, you will need to authenticate again with Internet
			Identity.
		</svelte:fragment>
	</KeyValuePairInfo>
</div>

<TokensMetadata />

<AdminAirdrop />
