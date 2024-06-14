import { networkEthereum, networkICP } from '$lib/derived/network.derived';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { AdditionalMenuItemSchema, type AdditionalMenuItem } from '$lib/types/tokens-menu';
import { derived, type Readable } from 'svelte/store';

export const additionalMenuItem: Readable<AdditionalMenuItem | undefined> = derived(
	[i18n, networkICP, networkEthereum],
	([$i18n, $networkICP, $networkEthereum]) => {
		const item = $networkICP
			? {
					openModal: modalStore.openIcManageTokens,
					label: $i18n.tokens.manage.text.title,
					ariaLabel: $i18n.tokens.manage.text.title
				}
			: $networkEthereum
				? {
						openModal: modalStore.openAddToken,
						label: `+ ${$i18n.tokens.import.text.title}`,
						ariaLabel: $i18n.tokens.import.text.title
					}
				: undefined;

		const parsedItem = AdditionalMenuItemSchema.safeParse(item);
		return parsedItem.success ? parsedItem.data : undefined;
	}
);
