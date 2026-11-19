export const NOTIFICATION_VERSIONS = {
	BtcActivityInfo: 1,
	NoIndexCanister: 1,
	HiddenMicroTransactions: 1
} as const;

// The longest qualifier, in UTF-8 bytes, that the backend stores with a dismissed notification.
export const NOTIFICATION_QUALIFIER_MAX_BYTES = 64;
