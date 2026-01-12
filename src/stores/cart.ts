import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
}

// Persistent cart state
export const cartItems = persistentAtom<CartItem[]>('cart', [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

export const isCartOpen = atom(false);

export const addCartItem = (item: Omit<CartItem, 'quantity'>) => {
    const existingItems = cartItems.get();
    const existingItemIndex = existingItems.findIndex((i) => i.id === item.id);

    if (existingItemIndex > -1) {
        const newItems = [...existingItems];
        newItems[existingItemIndex].quantity += 1;
        cartItems.set(newItems);
    } else {
        cartItems.set([...existingItems, { ...item, quantity: 1 }]);
    }
    isCartOpen.set(true);
};

export const removeCartItem = (id: string) => {
    cartItems.set(cartItems.get().filter((item) => item.id !== id));
};

export const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
        removeCartItem(id);
        return;
    }
    const newItems = cartItems.get().map((item) =>
        item.id === id ? { ...item, quantity } : item
    );
    cartItems.set(newItems);
};

export const cartTotal = computed(cartItems, (items) => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
});

export const cartCount = computed(cartItems, (items) => {
    return items.reduce((count, item) => count + item.quantity, 0);
});
