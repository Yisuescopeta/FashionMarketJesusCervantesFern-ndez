export function formatPrice(cents: number): string {
    return (cents / 100).toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
    });
}

export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}
