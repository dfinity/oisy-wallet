<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import { createEventDispatcher } from 'svelte';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';

	export let token: IcrcCustomToken;

	let disabled = false;
	$: disabled = token.category === 'default';

	let checked: boolean;
	$: checked = token.enabled;

	const dispatch = createEventDispatcher();

	const toggle = () => {
		if (disabled) {
			return;
		}

		checked = !checked;

		dispatch('icToken', {
			...token,
			enabled: checked
		});
	};
</script>

<Toggle
	ariaLabel={$i18n.tokens.text.hide_zero_balances}
	{disabled}
	bind:checked
	on:nnsToggle={toggle}
/>
