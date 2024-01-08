export const mapAddressStartsWith0x = (address: string) => {
	const PREFIX = '0x' as const;

	if (address.startsWith(PREFIX)) {
		return address;
	}

	return `${PREFIX}${address}`;
};
