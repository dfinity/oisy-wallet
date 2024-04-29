<script lang="ts">
	import { token } from '$lib/derived/token.derived';
	import { nonNullish } from '@dfinity/utils';
	import type { IcCkToken } from '$icp/types/ic';
	import type { Token as TokenType } from '$lib/types/token';
	import { modalStore } from '$lib/stores/modal.store';
	import { Modal } from '@dfinity/gix-components';
	import Token from '$lib/components/tokens/Token.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import Value from '$lib/components/ui/Value.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';

	let twinToken: TokenType | undefined;
	$: twinToken = ($token as IcCkToken).twinToken;
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.tokens.details.title}</svelte:fragment>

	<Token token={$token}>
		{#if nonNullish(twinToken)}
			<Value ref="name">
				<svelte:fragment slot="label">{$i18n.tokens.details.twin_token}</svelte:fragment>
				<span class="flex gap-1 items-center">
					<output>{twinToken.name}</output>
					<Logo src={twinToken.icon} alt={`${twinToken.name} logo`} size="20px" color="white" />
				</span>
			</Value>
		{/if}
	</Token>

	<button class="primary full center text-center" on:click={modalStore.close}
		>{$i18n.core.text.done}</button
	>
</Modal>
