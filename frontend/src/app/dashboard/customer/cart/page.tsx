"use client";

import React, { useEffect, useState } from "react";
import { getCart, removeFromCart, checkout, CartItem } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight, ShoppingBag, AlertCircle, Store, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MockRazorpayPopup from "@/components/payment/MockRazorpayPopup";

export default function CartPage() {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [checkingOut, setCheckingOut] = useState(false);
    const [mockOptions, setMockOptions] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {
        try {
            setError(null);
            const data = await getCart();
            setCartItems(data);
        } catch (error: any) {
            console.error("Failed to fetch cart:", error);
            if (error?.response?.status === 401) {
                setError("Please log in to view your cart.");
            } else {
                setError("Unable to load cart. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (id: number) => {
        try {
            await removeFromCart(id);
            fetchCart();
        } catch (error) {
            console.error("Failed to remove item:", error);
            alert("Failed to remove item. Please try again.");
        }
    };

    const handleCheckout = async () => {
        setCheckingOut(true);
        try {
            // 1. First create the order (status: pending, no payment yet)
            const order = await checkout();
            const orderId = order.id;
            const orderTotal = order.total_amount;

            // 2. Now initiate Razorpay payment
            const { createPaymentOrder, verifyPayment, getRazorpayConfig } = await import("@/lib/payment-api");

            const config = await getRazorpayConfig();
            const paymentOrder = await createPaymentOrder({
                amount: orderTotal,
                payment_for: "customer_order",
                reference_id: orderId,
                shipping_address: "To be updated",
            });

            // 3. Load Razorpay SDK if needed
            if (!window.Razorpay) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement("script");
                    script.src = "https://checkout.razorpay.com/v1/checkout.js";
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error("Failed to load Razorpay"));
                    document.body.appendChild(script);
                });
            }

            // 4. Open Razorpay popup
            const options = {
                key: config.key_id,
                amount: Math.round(orderTotal * 100),
                currency: "INR",
                name: "AgriChain",
                description: `Order #${orderId}`,
                order_id: paymentOrder.razorpay_order_id,
                theme: { color: "#16a34a" },
                handler: async (response: any) => {
                    try {
                        await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        router.push("/dashboard/customer/orders");
                    } catch (err) {
                        alert("Payment verification failed. Contact support.");
                    } finally {
                        setCheckingOut(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setCheckingOut(false);
                        alert("Payment cancelled. Your order is saved as pending.");
                    },
                },
            };

            if (config.key_id.startsWith("rzp_test_placeholder")) {
                setMockOptions(options);
                return;
            }

            const razorpay = new (window as any).Razorpay(options);
            razorpay.open();
        } catch (error: any) {
            console.error("Checkout failed:", error);
            const message = error?.response?.data?.detail || "Checkout failed. Please try again.";
            alert(message);
            setCheckingOut(false);
        }
    };

    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 p-4">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <ShoppingBag className="w-8 h-8" /> Your Shopping Cart
                </h1>
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
                        <h2 className="text-lg font-semibold text-red-700">{error}</h2>
                        <div className="mt-4 flex gap-4 justify-center">
                            <Button onClick={fetchCart} variant="outline" className="border-red-300 text-red-700">
                                Try Again
                            </Button>
                            <Link href="/dashboard/customer/marketplace">
                                <Button className="bg-green-600 hover:bg-green-700 text-white">Browse Marketplace</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <ShoppingBag className="w-8 h-8 text-green-600" /> Your Shopping Cart
            </h1>

            {cartItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border shadow-sm">
                    <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700">Your cart is empty</h2>
                    <p className="text-gray-500 mb-6">Looks like you haven&apos;t added anything yet.</p>
                    <Link href="/dashboard/customer/marketplace">
                        <Button className="bg-green-600 hover:bg-green-700 text-white">Browse Marketplace</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cart Items List */}
                    <div className="lg:col-span-2 space-y-4">
                        {cartItems.map((item) => (
                            <Card key={item.id} className="border-gray-200 hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        {/* Product Image */}
                                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-lg text-gray-800">{item.product_name}</h3>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <Store className="h-3 w-3" /> {item.seller_name}
                                            </p>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-sm font-medium text-gray-700">Qty: {item.quantity}</span>
                                                <span className="text-xs text-gray-400">@ ₹{item.price}/unit</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-lg text-green-700">₹{(item.price * item.quantity).toLocaleString()}</div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 mt-2"
                                                onClick={() => handleRemove(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <Card className="h-fit border-gray-200 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-gray-800">Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal ({cartItems.length} items)</span>
                                <span className="font-medium text-gray-800">₹{total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Shipping</span>
                                <span className="text-green-600 font-medium">Free</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Taxes</span>
                                <span className="text-gray-800">₹0.00</span>
                            </div>
                            <div className="border-t pt-3 mt-2 flex justify-between font-bold text-lg">
                                <span className="text-gray-800">Total</span>
                                <span className="text-green-700">₹{total.toLocaleString()}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                                onClick={handleCheckout}
                                disabled={checkingOut}
                            >
                                {checkingOut ? "Processing..." : "Checkout"}
                                {!checkingOut && <ArrowRight className="w-5 h-5 ml-2" />}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {mockOptions && <MockRazorpayPopup options={mockOptions} onClose={() => setMockOptions(null)} />}
        </div>
    );
}
