// ============ Utility Functions ============

export const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

export const generateOrderNumber = () => {
  const date = new Date();
  return `ORD-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, '0')}`;
};

export const DISCOUNT_RATE = 0.2;

export const calcDiscountedPrice = (price: number) => price * (1 - DISCOUNT_RATE);