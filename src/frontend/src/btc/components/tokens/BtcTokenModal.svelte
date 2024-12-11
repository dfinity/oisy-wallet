<script lang="ts">
import { modalStore } from '$lib/stores/modal.store';
import { Modal } from '@dfinity/gix-components';
import { i18n } from '$lib/stores/i18n.store';
import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
import { nonNullish } from '@dfinity/utils';
import { token } from '$lib/stores/token.store';
import Token from '$lib/components/tokens/Token.svelte';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.tokens.details.title}</svelte:fragment>

	<ContentWithToolbar>
		{#if nonNullish($token)}
			<Token token={$token} />
		{/if}

		<ButtonDone on:click={modalStore.close} slot="toolbar" />
	</ContentWithToolbar>
</Modal>