export enum QrCodeType {
	VIP = 'vip',
	GOLD = 'gold'
}

export const asQrCodeType = (key: string) =>
	Object.values(QrCodeType).find((value) => value === key);
