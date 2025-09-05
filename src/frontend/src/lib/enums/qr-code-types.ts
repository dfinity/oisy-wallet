export enum QrCodeType {
	VIP = 'vip',
	GOLD = 'gold',
	CLICKBEE = 'clickbee'
}

export const asQrCodeType = (key: string) =>
	Object.values(QrCodeType).find((value) => value === key);
