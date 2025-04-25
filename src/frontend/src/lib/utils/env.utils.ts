import type { OptionString } from '$lib/types/string';

// Since the env variables are defined as `any` type, there is the risk that passing the simple variable it is accepted as object.
// Example: `parseBoolEnvVar(import.meta.env.ENV_VARIABLE)` is type-accepted even if it should be `parseBoolEnvVar({ value: import.meta.env.ENV_VARIABLE })`
// To avoid possible issues, we decided to give the parameters as array of objects and not as single object for this specific util.
// eslint-disable-next-line local-rules/prefer-object-params
export const parseBoolEnvVar = (value: OptionString, check = true): boolean =>
	JSON.parse(value?.toLowerCase() ?? 'false') === check;

export const parseEnabledMainnetBoolEnvVar = (value: OptionString): boolean =>
	parseBoolEnvVar(value, false);
