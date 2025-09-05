<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { MANAGE_TOKENS_MODAL_TOKEN_TOGGLE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { isIcrcTokenToggleDisabled } from '$lib/utils/token-toggle.utils';

	export let token: IcrcCustomToken;
	export let testIdPrefix = MANAGE_TOKENS_MODAL_TOKEN_TOGGLE;

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
	testId={`${testIdPrefix}-${token.symbol}-${token.network.id.description}`}
	bind:checked
	on:nnsToggle={toggle}
/>
