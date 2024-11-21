<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import { type IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { i18n } from '$lib/stores/i18n.store';
	import { isIcrcTokenToggleDisabled } from '$lib/utils/token-toggle.utils';

	export let token: IcrcCustomToken;

	let disabled = false;
	$: disabled = isIcrcTokenToggleDisabled(token);

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
	ariaLabel={checked ? $i18n.tokens.text.hide_token : $i18n.tokens.text.show_token}
	{disabled}
	bind:checked
	on:nnsToggle={toggle}
/>
