import {browser} from "$app/environment";

export const hideBitcoinInfo = (): boolean => {
    try {
        const { hide_bitcoin_info }: Storage = browser ? localStorage : ({ hide_bitcoin_info: 'false' } as unknown as Storage);
        return hide_bitcoin_info === "true";
    } catch (err: unknown) {
        // We use the local storage for the operational part of the app but, not crucial
        console.error(err);
        return false;
    }
};