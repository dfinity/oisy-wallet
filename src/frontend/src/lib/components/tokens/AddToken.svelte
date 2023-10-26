<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import IconPlus from '$lib/components/icons/IconPlus.svelte';
	import { modalAddToken } from '$lib/derived/modal.derived';
	import AddTokenModal from '$lib/components/tokens/AddTokenModal.svelte';

	export let iconSize: 'big' | 'small' = 'big';
</script>

<button on:click={() => modalStore.openAddToken()} class="contents">
	<Card>
		<span class="text-grey">Add new token</span>

		<RoundedIcon slot="icon" icon={IconPlus} backgroundStyleClass="bg-dust" iconSize={iconSize === 'small' ? '32px' : '3rem'} />
	</Card>
</button>

{#if $modalAddToken}
	<AddTokenModal />
{/if}
