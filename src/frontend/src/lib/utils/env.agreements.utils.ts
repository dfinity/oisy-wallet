import type { EnvAgreements } from '$env/types/env-agreements';

export const transformAgreementsJsonBigint = (
	json: Record<string, { lastUpdatedTimestamp: { __bigint__: string }; lastUpdatedDate: string }>
): EnvAgreements => {
	const res: Record<string, { lastUpdatedTimestamp: bigint; lastUpdatedDate: string }> = {};
	Object.entries(json).forEach(
		([
			key,
			{
				lastUpdatedTimestamp: { __bigint__ },
				...rest
			}
		]) => {
			res[key] = {
				...rest,
				lastUpdatedTimestamp: BigInt(__bigint__)
			};
		}
	);
	return res as EnvAgreements;
};
