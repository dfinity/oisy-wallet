import { TOKEN_GROUPS_BY_SYMBOL } from '$env/tokens/groups/groups.env';
import type { TokenGroup } from '$lib/types/token-group';
import { nonNullish } from '@dfinity/utils';

export const mapEnvGroupData = (groupDataId: string | undefined): TokenGroup => {
	if (nonNullish(groupDataId)) {
		const group = TOKEN_GROUPS_BY_SYMBOL[groupDataId];

		if (nonNullish(group)) {
			return { groupData: group };
		}
	}

	return {};
};
