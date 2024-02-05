<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import { IconClose, KeyValuePairInfo } from '@dfinity/gix-components';
	import { tokens } from '$lib/derived/tokens.derived';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { listUserTokens, removeUserToken } from '$lib/api/backend.api';
	import type { Token } from '$declarations/backend/backend.did';
	import { authStore } from '$lib/stores/auth.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionIdentity } from '$lib/types/identity';
	import { isNullish } from '@dfinity/utils';
	import { ETH_CHAIN_ID } from '$eth/constants/eth.constants';
	import { busy } from '$lib/stores/busy.store';

	let userTokens: Token[] = [];

	const loadUserTokens = async (identity: OptionIdentity) => {
		if (isNullish(identity)) {
			userTokens = [];
			return;
		}

		try {
			userTokens = await listUserTokens({ identity });
		} catch (err: unknown) {
			userTokens = [];

			toastsError({
				msg: { text: 'Unexpected error while loading your custom tokens.' },
				err
			});
		}
	};

	$: $authStore, (async () => await loadUserTokens($authStore.identity))();

	const deleteUserToken = async ({ contract_address }: Token) => {
		if (isNullish($authStore.identity)) {
			toastsError({
				msg: { text: 'You are not logged in.' }
			});
			return;
		}

		busy.start();

		try {
			await removeUserToken({
				identity: $authStore.identity,
				tokenId: {
					chain_id: ETH_CHAIN_ID,
					contract_address
				}
			});

			// This PR is just a workaround for staging anyway.
			window.location.reload();
		} catch (err: unknown) {
			toastsError({
				msg: { text: 'Unexpected error while deleting your custom token.' },
				err
			});
		}

		busy.stop();
	};
</script>

<div class="mt-4 mb-2">
	<KeyValuePairInfo>
		<svelte:fragment slot="key"><span class="font-bold">Tokens:</span></svelte:fragment>

		<svelte:fragment slot="info">
			The list of tokens currently supported by your {OISY_NAME}.
		</svelte:fragment>
	</KeyValuePairInfo>
</div>

{#each $tokens as token, i}
	{@const last = i === $tokens.length - 1}

	<div
		class="flex gap-1"
		style={`border-left: 1px solid var(--color-platinum); border-top: 1px solid var(--color-platinum); border-right: 1px solid var(--color-platinum); ${
			last ? 'border-bottom: 1px solid var(--color-platinum);' : ''
		}`}
		class:rounded-tl-sm={i === 0}
		class:rounded-tr-sm={i === 0}
		class:rounded-bl-sm={last}
		class:rounded-br-sm={last}
	>
		<div class="flex items-center justify-center pl-2 pr-1">
			<Logo src={token.icon} alt={`${token.name} logo`} size="32" color="white" />
		</div>

		<div class="py-4">
			<p><strong>{token.name}</strong> <small>({token.symbol})</small></p>

			<span class="break-all py-4">
				<small>Decimals: {token.decimals}</small>
			</span>
		</div>
	</div>
{/each}

<ul class="my-4 mx-4">
	{#each userTokens as userToken, i (`${userToken.contract_address}-${i}}`)}
		<li class="text-sm flex">
			<button aria-label="delete-user-token" on:click={async () => await deleteUserToken(userToken)}
				><IconClose />{userToken.contract_address}</button
			>
		</li>
	{/each}
</ul>
