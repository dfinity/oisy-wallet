import type { TokenGroupData } from '$lib/types/token-group';
import { nonNullish } from '@dfinity/utils';

const groupModules = import.meta.glob<Record<string, TokenGroupData>>('./groups.*.env.ts', {
	eager: true
});

const TOKEN_GROUPS: TokenGroupData[] = Object.values(groupModules).flatMap((mod) =>
	Object.entries(mod)
		.filter(([key]) => key.endsWith('_TOKEN_GROUP') && !key.endsWith('_TOKEN_GROUP_ID'))
		.map(([, value]) => value)
);

export const TOKEN_GROUPS_BY_SYMBOL: Record<string, TokenGroupData> = TOKEN_GROUPS.reduce(
	(acc, group) =>
		nonNullish(group.id.description)
			? {
					...acc,
					[group.id.description]: group
				}
			: acc,
	{}
);
