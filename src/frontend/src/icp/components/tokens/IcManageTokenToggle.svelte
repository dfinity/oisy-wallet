<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';
	import type { IcrcCustomTokenConfig } from '$icp/types/icrc-custom-token';
	import { createEventDispatcher } from 'svelte';

	export let token: IcrcCustomTokenConfig;

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
