import type { OptionString } from '$lib/types/string';

// Since the env variables are defined as `any` type, there is the risk that passing the simple variable it is accepted as object.
// Example: `parseBoolEnvVar(import.meta.env.ENV_VARIABLE)` is type-accepted even if it should be `parseBoolEnvVar({ value: import.meta.env.ENV_VARIABLE })`
// To avoid possible issues, we decided to give the parameters as array of objects and not as single object for this specific util.
// eslint-disable-next-line local-rules/prefer-object-params
export const parseBoolEnvVar = (value: OptionString, check = true): boolean => {
	const normalised = value?.toLowerCase();
	if (normalised === '') {
		throw new Error(
			'[parseBoolEnvVar] Empty string received as environment variable. ' +
				'Verify that all the environment variables that are being set in the deployment CI workflow exist as secrets in GitHub. ' +
				"If you don't want to set it as GitHub secret, remove it from the workflow: it will default to 'false'."
		);
	}
	return JSON.parse(normalised ?? 'false') === check;
};

export const parseEnabledMainnetBoolEnvVar = (value: OptionString): boolean =>
	parseBoolEnvVar(value, false);
