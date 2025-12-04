<script lang="ts">
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import PayTokenList from '$lib/components/scanner/open-crypto-pay/PayTokensList.svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();
</script>

<ContentWithToolbar styleClass="flex flex-col w-full">
	<PayTokenList {onClose} />
	{#snippet toolbar()}
		<ButtonBack fullWidth onclick={() => onClose()} />
	{/snippet}
</ContentWithToolbar>
