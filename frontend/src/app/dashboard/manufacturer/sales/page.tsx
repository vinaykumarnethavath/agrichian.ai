"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createManufacturerSale, getManufacturerSales, getMyProducts, Product, ManufacturerSale } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, IndianRupee, TrendingUp } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import MockRazorpayPopup from "@/components/payment/MockRazorpayPopup";

export default function SalesPage() {
    const [sales, setSales] = useState<ManufacturerSale[]>([]);
    const [finishedGoods, setFinishedGoods] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mockOptions, setMockOptions] = useState<any>(null);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

    const qty = watch("quantity");
    const price = watch("selling_price");
    const discount = watch("discount");
    const selectedProdId = watch("product_id");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [history, products] = await Promise.all([
                getManufacturerSales(),
                getMyProducts()
            ]);
            setSales(history);
            setFinishedGoods(products.filter(p => p.category === 'processed'));
        } catch (error) {
            console.error("Failed to fetch sales data:", error);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: any) => {
        try {
            const saleData = {
                ...data,
                quantity: parseFloat(data.quantity),
                selling_price: parseFloat(data.selling_price),
                discount: parseFloat(data.discount || 0),
                product_id: parseInt(data.product_id),
                payment_mode: data.payment_mode || "Cash",
            };

            const sale = await createManufacturerSale(saleData);

            // If Razorpay selected, open payment gateway
            if (data.payment_mode === "Razorpay") {
                const { createPaymentOrder, verifyPayment, getRazorpayConfig } = await import("@/lib/payment-api");
                const config = await getRazorpayConfig();
                const totalAmount = (parseFloat(data.quantity) * parseFloat(data.selling_price)) - parseFloat(data.discount || 0);

                const paymentOrder = await createPaymentOrder({
                    amount: totalAmount,
                    payment_for: "manufacturer_sale",
                    reference_id: sale.id,
                });

                if (!(window as any).Razorpay) {
                    await new Promise<void>((resolve, reject) => {
                        const script = document.createElement("script");
                        script.src = "https://checkout.razorpay.com/v1/checkout.js";
                        script.onload = () => resolve();
                        script.onerror = () => reject();
                        document.body.appendChild(script);
                    });
                }

                const options = {
                    key: config.key_id,
                    amount: Math.round(totalAmount * 100),
                    currency: "INR",
                    name: "AgriChain Manufacturer",
                    description: `Sale Invoice ${sale.invoice_id}`,
                    order_id: paymentOrder.razorpay_order_id,
                    theme: { color: "#9333ea" },
                    handler: async (response: any) => {
                        try {
                            await verifyPayment({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            });
                            alert("Payment collected successfully!");
                        } catch (err) {
                            alert("Payment verification failed.");
                        }
                        fetchData();
                        setIsModalOpen(false);
                        reset();
                    },
                };

                if (config.key_id.startsWith("rzp_test_placeholder")) {
                    setMockOptions(options);
                    return;
                }

                const razorpay = new (window as any).Razorpay(options);
                razorpay.open();
                return; // Don't close modal yet — Razorpay popup handles it
            }

            fetchData();
            setIsModalOpen(false);
            reset();
        } catch (error) {
            console.error("Failed to record sale:", error);
            alert("Failed to record sale. Check stock.");
        }
    };

    const calculateTotal = () => {
        const q = parseFloat(qty) || 0;
        const p = parseFloat(price) || 0;
        const d = parseFloat(discount) || 0;
        return (q * p) - d;
    };

    const selectedProduct = finishedGoods.find(p => p.id.toString() === selectedProdId);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Sales & Distribution</h1>
                    <p className="text-gray-500">Sell finished goods to shops and distributors</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                    <ShoppingCart className="w-4 h-4 mr-2" /> Record New Sale
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" /> Sales History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Invoice ID</th>
                                    <th className="px-6 py-4">Buyer</th>
                                    <th className="px-6 py-4">Product</th>
                                    <th className="px-6 py-4 text-right">Qty</th>
                                    <th className="px-6 py-4 text-right">Price</th>
                                    <th className="px-6 py-4 text-right">Total Amount</th>
                                    <th className="px-6 py-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                            No sales recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    sales.map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-mono text-xs">{s.invoice_id}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{s.buyer_name}</div>
                                                <div className="text-xs text-gray-500 capitalize">{s.buyer_type}</div>
                                            </td>
                                            <td className="px-6 py-4">{s.product_id}</td> {/* Ideally join name, but ID for MVP ok */}
                                            <td className="px-6 py-4 text-right">{s.quantity}</td>
                                            <td className="px-6 py-4 text-right">₹{s.selling_price}</td>
                                            <td className="px-6 py-4 text-right font-bold text-green-700">₹{s.total_amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Sale">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Buyer Name</Label>
                            <Input {...register("buyer_name", { required: true })} placeholder="Shop / Distributor Name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Buyer Type</Label>
                            <select {...register("buyer_type")} className="w-full p-2 border rounded-md">
                                <option value="shop">Shop / Retailer</option>
                                <option value="distributor">Distributor</option>
                                <option value="customer">Direct Customer</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Product to Sell</Label>
                        <select {...register("product_id", { required: true })} className="w-full p-2 border rounded-md">
                            <option value="">-- Select Finished Good --</option>
                            {finishedGoods.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity} {p.unit})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <div className="flex gap-2">
                                <Input type="number" step="0.01" {...register("quantity", { required: true })} />
                                <span className="p-2 flex items-center text-sm text-gray-500 bg-gray-50 rounded border">{selectedProduct?.unit || 'unit'}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Selling Price (Per Unit)</Label>
                            <Input type="number" step="0.01" {...register("selling_price", { required: true })} />
                            {selectedProduct && selectedProduct.cost_price && (
                                <div className="text-xs text-gray-400">Est. Cost: ₹{selectedProduct.cost_price.toFixed(2)}</div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Discount (₹)</Label>
                            <Input type="number" step="0.01" {...register("discount")} defaultValue={0} />
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <select {...register("payment_mode")} className="w-full p-2 border rounded-md">
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Razorpay">Razorpay (Online)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-gray-100 p-4 rounded-lg flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Total Invoice Amount:</span>
                        <span className="text-xl font-bold text-green-700">₹{calculateTotal().toLocaleString()}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Confirm Sale</Button>
                    </div>
                </form>
            </Modal>

            {mockOptions && <MockRazorpayPopup options={mockOptions} onClose={() => setMockOptions(null)} />}
        </div>
    );
}
