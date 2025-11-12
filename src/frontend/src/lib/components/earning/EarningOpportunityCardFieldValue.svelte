<script lang="ts">
	import { fade } from 'svelte/transition';
	import {
		type EarningCardFields,
		EarningCardFields as EarningCardFieldsEnum
	} from '$env/types/env.earning-cards';
	import type { Token } from '$lib/types/token';
	import { ZERO } from '$lib/constants/app.constants';
	import { nonNullish } from '@dfinity/utils';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		value: string;
		type: EarningCardFields;
	}

	const { value, type }: Props = $props();

	const valueBigint = $derived(BigInt(value));
</script>

{#if type === EarningCardFieldsEnum.APY}
	<output>{value}</output>
{:else if type === EarningCardFieldsEnum.CURRENT_STAKED || type === EarningCardFieldsEnum.}
	<span class="text-tertiary" in:fade>
		{value}
	</span>
{:else if type === EarningCardFieldsEnum.CURRENT_EARNING && nonNullish(token)}{/if}
