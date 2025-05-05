<script lang="ts">
	import { Toasts, SystemThemeListener } from '@dfinity/gix-components';
	import { onMount, type Snippet } from 'svelte';
	import { mockIdentity } from '../../tests/mocks/identity.mock';
	import Banner from '$lib/components/core/Banner.svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import Busy from '$lib/components/ui/Busy.svelte';
	import ModalExitHandler from '$lib/components/ui/ModalExitHandler.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { modalStore } from '$lib/stores/modal.store';

	let { children }: { children: Snippet } = $props();
	authStore.setForTesting(mockIdentity);
	modalStore.close();
</script>

<div class="bg-primary text-primary">
	{@render children()}
	<Modals />
	<Banner />
	<Toasts maxVisible={3} />
	<Busy />
	<ModalExitHandler />
	<SystemThemeListener />
</div>
