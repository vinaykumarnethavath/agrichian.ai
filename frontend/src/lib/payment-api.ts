import api from './api';

// --- Payment API ---

export interface PaymentOrder {
    id: number;
    user_id: number;
    razorpay_order_id: string;
    razorpay_payment_id: string | null;
    amount: number;
    currency: string;
    status: string;
    payment_for: string;
    reference_id: number | null;
    shipping_address: string | null;
    shipping_status: string | null;
    tracking_id: string | null;
    notes: string | null;
    created_at: string;
    paid_at: string | null;
}

export interface CreatePaymentRequest {
    amount: number;
    payment_for: string;
    reference_id?: number;
    shipping_address?: string;
    notes?: string;
}

export interface VerifyPaymentRequest {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

export const getRazorpayConfig = async () => {
    const response = await api.get<{ key_id: string }>("/payments/config");
    return response.data;
};

export const createPaymentOrder = async (data: CreatePaymentRequest) => {
    const response = await api.post<PaymentOrder>("/payments/create-order", data);
    return response.data;
};

export const verifyPayment = async (data: VerifyPaymentRequest) => {
    const response = await api.post("/payments/verify", data);
    return response.data;
};

export const getPaymentHistory = async () => {
    const response = await api.get<PaymentOrder[]>("/payments/history");
    return response.data;
};

export const updateShippingStatus = async (
    paymentId: number,
    shippingStatus: string,
    trackingId?: string
) => {
    const params: any = { shipping_status: shippingStatus };
    if (trackingId) params.tracking_id = trackingId;
    const response = await api.put(`/payments/${paymentId}/shipping`, null, { params });
    return response.data;
};
