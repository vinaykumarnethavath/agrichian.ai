"use client";

import React, { useState } from "react";
import { createPaymentOrder, verifyPayment, getRazorpayConfig } from "@/lib/payment-api";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, CheckCircle, XCircle } from "lucide-react";

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface RazorpayCheckoutProps {
    amount: number;
    paymentFor: string;
    referenceId?: number;
    shippingAddress?: string;
    notes?: string;
    buttonLabel?: string;
    buttonClassName?: string;
    disabled?: boolean;
    onSuccess: (paymentData: any) => void;
    onFailure?: (error: any) => void;
    userInfo?: {
        name?: string;
        email?: string;
        phone?: string;
    };
}

export default function RazorpayCheckout({
    amount,
    paymentFor,
    referenceId,
    shippingAddress,
    notes,
    buttonLabel = "Pay Online",
    buttonClassName = "",
    disabled = false,
    onSuccess,
    onFailure,
    userInfo,
}: RazorpayCheckoutProps) {
    const [processing, setProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "failed">("idle");

    const loadRazorpayScript = (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async () => {
        setProcessing(true);
        setPaymentStatus("idle");

        try {
            // 1. Load Razorpay SDK
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                throw new Error("Failed to load Razorpay SDK");
            }

            // 2. Get Razorpay key
            const config = await getRazorpayConfig();

            // 3. Create order on our backend
            const order = await createPaymentOrder({
                amount,
                payment_for: paymentFor,
                reference_id: referenceId,
                shipping_address: shippingAddress,
                notes,
            });

            // 4. Open Razorpay checkout
            const options = {
                key: config.key_id,
                amount: Math.round(amount * 100), // paise
                currency: "INR",
                name: "AgriChain",
                description: `Payment for ${paymentFor.replace(/_/g, " ")}`,
                order_id: order.razorpay_order_id,
                prefill: {
                    name: userInfo?.name || "",
                    email: userInfo?.email || "",
                    contact: userInfo?.phone || "",
                },
                theme: {
                    color: "#16a34a", // green-600
                },
                handler: async (response: any) => {
                    try {
                        // 5. Verify on backend
                        const result = await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        setPaymentStatus("success");
                        onSuccess(result);
                    } catch (err) {
                        setPaymentStatus("failed");
                        onFailure?.(err);
                    } finally {
                        setProcessing(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                    },
                },
            };

            if (config.key_id.startsWith("rzp_test_placeholder")) {
                alert("Test Mode: Simulating successful payment...");
                options.handler({
                    razorpay_order_id: order.razorpay_order_id,
                    razorpay_payment_id: "pay_dummy_" + Math.random().toString(36).substring(2, 9),
                    razorpay_signature: "dummy_signature",
                });
                return;
            }

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error) {
            console.error("Payment error:", error);
            setPaymentStatus("failed");
            setProcessing(false);
            onFailure?.(error);
        }
    };

    return (
        <div className="inline-flex items-center gap-2">
            <Button
                type="button"
                onClick={handlePayment}
                disabled={disabled || processing || amount <= 0}
                className={`${buttonClassName || "bg-blue-600 hover:bg-blue-700 text-white"}`}
            >
                {processing ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : paymentStatus === "success" ? (
                    <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Paid ✓
                    </>
                ) : paymentStatus === "failed" ? (
                    <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Retry Payment
                    </>
                ) : (
                    <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {buttonLabel} — ₹{amount.toLocaleString()}
                    </>
                )}
            </Button>
        </div>
    );
}
