<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { Modal } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatSecondsToDate } from '$lib/utils/format.utils';
	import Value from '$lib/components/ui/Value.svelte';
	import { token } from '$lib/derived/token.derived';
	import Logo from '$lib/components/ui/Logo.svelte';
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">{$i18n.tokens.details.title}</svelte:fragment>

	<Value ref="network">
		<svelte:fragment slot="label">{$i18n.tokens.details.network}</svelte:fragment>
		<span class="flex gap-1 items-center">
			<output>{$token.network.name}</output>
			<Logo src={$token.network.icon} alt={`${$token.network.name} logo`} size="20px" color="white" />
		</span>
	</Value>

	<Value ref="name">
		<svelte:fragment slot="label">{$i18n.tokens.details.token}</svelte:fragment>
		<span class="flex gap-1 items-center">
			<output>{$token.name}</output>
			<Logo src={$token.icon} alt={`${$token.name} logo`} size="20px" color="white" />
		</span>
	</Value>

	<slot />

	<Value ref="symbol">
		<svelte:fragment slot="label">{$i18n.core.text.symbol}</svelte:fragment>
		<output>{$token.symbol}</output>
	</Value>

	<Value ref="decimals">
		<svelte:fragment slot="label">{$i18n.core.text.decimals}</svelte:fragment>
		<output>{$token.decimals}</output>
	</Value>
</Modal>
