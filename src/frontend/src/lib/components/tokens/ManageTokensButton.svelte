<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import { MANAGE_TOKENS_MODAL_BUTTON } from '$lib/constants/test-ids.constants';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		label: Snippet;
	}

	let { label }: Props = $props();

	let disabled = $derived($authNotSignedIn);

	const manageTokensId = $state(Symbol());
</script>

<button
	class="tertiary"
	data-tid={MANAGE_TOKENS_MODAL_BUTTON}
	{disabled}
	onclick={() => modalStore.openManageTokens({ id: manageTokensId })}
>
	<IconManage />
	{@render label()}
</button>
