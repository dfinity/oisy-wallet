<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { modalCardConnectOpen } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	let connected = $state(false);

	let email = $state('');
</script>

{#if !connected}
	<Button
		colorStyle="primary"
		fullWidth
		onclick={() => modalStore.openCardConnect(Symbol())}
		paddingSmall
		type="button"
	>
		Connect
	</Button>
{/if}

{#if $modalCardConnectOpen}
	<Modal onClose={modalStore.close}>
		{#snippet title()}Connect to Zebec{/snippet}

		<ContentWithToolbar>
			<label class="font-bold" for="email">Email</label>
			<InputText name="email" placeholder="email" bind:value={email} />

			{#snippet toolbar()}
				<ButtonCloseModal />
			{/snippet}
		</ContentWithToolbar>
	</Modal>
{/if}
