"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import Link from "next/link";
import {
    ShoppingCart,
    Search,
    Package,
    Minus,
    Plus,
    Trash2,
    ArrowLeft,
    History,
    CheckCircle,
    Clock,
    Leaf,
    Droplets,
    Bug,
    Wrench,
    Store,
    Star,
    ChevronDown
} from "lucide-react";

interface Product {
    id: number;
    name: string;
    short_name?: string;
    category: string;
    brand?: string;
    price: number;
    quantity: number;
    batch_number: string;
    description?: string;
    image_url?: string;
    user_id: number;
    seller_name?: string;
}

interface CartItem {
    product: Product;
    quantity: number;
}

interface ShopInfo {
    id: number;
    name: string;
}

interface OrderItem {
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

interface Order {
    id: number;
    shop_id: number;
    farmer_id?: number;
    total_amount: number;
    discount: number;
    final_amount: number;
    payment_mode: string;
    status: string;
    created_at: string;
    items?: OrderItem[];
}

// Short names commonly used by farmers
const COMMON_SHORT_NAMES: Record<string, string> = {
    "DAP": "DAP (Di-Ammonium Phosphate)",
    "MOP": "MOP (Muriate of Potash)",
    "NPK": "NPK Fertilizer",
    "Urea": "Urea (46-0-0)",
    "SSP": "SSP (Single Super Phosphate)",
    "ZnSO4": "Zinc Sulphate",
    "Potash": "Potash / MOP",
};

export default function MarketPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedShop, setSelectedShop] = useState<number | null>(null);
    const [shops, setShops] = useState<ShopInfo[]>([]);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [placingOrder, setPlacingOrder] = useState(false);

    const categories = [
        { id: "all", name: "All Products", icon: Package },
        { id: "fertilizer", name: "Fertilizers", icon: Leaf },
        { id: "pesticide", name: "Pesticides", icon: Bug },
        { id: "seeds", name: "Seeds", icon: Droplets },
        { id: "equipment", name: "Equipment", icon: Wrench },
    ];

    useEffect(() => {
        fetchProducts();
        fetchOrders();
        fetchShops();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await api.get("/products");
            setProducts(response.data);
        } catch (error) {
            console.error("Failed to fetch products:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchShops = async () => {
        try {
            const response = await api.get("/products/shops");
            setShops(response.data);
        } catch (error) {
            console.error("Failed to fetch shops:", error);
        }
    };

    const fetchOrders = async () => {
        try {
            const response = await api.get("/orders/my-orders");
            setOrders(response.data);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        }
    };

    // Filter products by search, category, and shop
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch =
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.short_name && product.short_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
            const matchesShop = selectedShop === null || product.user_id === selectedShop;

            return matchesSearch && matchesCategory && matchesShop;
        });
    }, [products, searchQuery, selectedCategory, selectedShop]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity) }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateCartQuantity = (productId: number, delta: number) => {
        setCart(prev =>
            prev.map(item => {
                if (item.product.id === productId) {
                    const newQty = Math.max(1, Math.min(item.quantity + delta, item.product.quantity));
                    return { ...item, quantity: newQty };
                }
                return item;
            })
        );
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const placeOrder = async () => {
        if (placingOrder) return;
        setPlacingOrder(true);
        try {
            // Group cart items by shop (user_id)
            const shopGroups: Record<number, CartItem[]> = {};
            for (const item of cart) {
                const shopId = item.product.user_id;
                if (!shopGroups[shopId]) shopGroups[shopId] = [];
                shopGroups[shopId].push(item);
            }

            // Create one order per shop
            for (const shopId in shopGroups) {
                const items = shopGroups[shopId].map(item => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                }));

                await api.post("/orders/", {
                    items,
                    payment_mode: "cash",
                    discount: 0,
                });
            }

            setCart([]);
            setOrderPlaced(true);
            fetchOrders();
            fetchProducts(); // Refresh stock
            setTimeout(() => {
                setOrderPlaced(false);
                setShowCart(false);
            }, 3000);
        } catch (error: any) {
            console.error("Failed to place order:", error);
            alert(error?.response?.data?.detail || "Failed to place order. Please try again.");
        } finally {
            setPlacingOrder(false);
        }
    };

    const getShortName = (product: Product) => {
        return product.short_name || product.name;
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "fertilizer": return <Leaf className="h-4 w-4" />;
            case "pesticide": return <Bug className="h-4 w-4" />;
            case "seeds": return <Droplets className="h-4 w-4" />;
            case "equipment": return <Wrench className="h-4 w-4" />;
            default: return <Package className="h-4 w-4" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "fertilizer": return "bg-emerald-100 text-emerald-700";
            case "pesticide": return "bg-rose-100 text-rose-700";
            case "seeds": return "bg-blue-100 text-blue-700";
            case "equipment": return "bg-amber-100 text-amber-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "completed": return "bg-emerald-100 text-emerald-700";
            case "confirmed": return "bg-blue-100 text-blue-700";
            case "dispatched": return "bg-purple-100 text-purple-700";
            case "pending": return "bg-amber-100 text-amber-700";
            case "cancelled": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
            </div>
        );
    }

    // ===========================
    //  ORDER HISTORY VIEW
    // ===========================
    if (showHistory) {
        return (
            <div className="space-y-6 p-2">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => setShowHistory(false)}
                        className="flex items-center gap-2 border-gray-300 text-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Market
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-800">Order History</h1>
                </div>

                {orders.length === 0 ? (
                    <Card className="border-dashed border-2">
                        <CardContent className="p-12 text-center">
                            <History className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-bold text-gray-600">No orders yet</h3>
                            <p className="text-gray-500">Your order history will appear here</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {orders.map(order => (
                            <Card key={order.id} className="border-gray-200 hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-gray-800 text-lg">Order #{order.id}</p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-700 text-xl">₹{order.final_amount.toLocaleString()}</p>
                                            <span className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusStyle(order.status)}`}>
                                                {order.status === 'completed' ? <CheckCircle className="h-3 w-3 inline mr-1" /> : <Clock className="h-3 w-3 inline mr-1" />}
                                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                    {order.items && order.items.length > 0 && (
                                        <div className="border-t border-gray-100 pt-3 mt-3">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm py-1">
                                                    <span className="text-gray-600">{item.product_name} × {item.quantity}</span>
                                                    <span className="font-medium text-gray-800">₹{item.subtotal.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ===========================
    //  CART VIEW
    // ===========================
    if (showCart) {
        return (
            <div className="space-y-6 p-2">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => setShowCart(false)}
                        className="flex items-center gap-2 border-gray-300 text-gray-700"
                    >
                        <ArrowLeft className="h-4 w-4" /> Continue Shopping
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-800">Your Cart</h1>
                </div>

                {orderPlaced ? (
                    <Card className="bg-emerald-50 border-emerald-200">
                        <CardContent className="p-12 text-center">
                            <CheckCircle className="h-20 w-20 mx-auto text-emerald-500 mb-4" />
                            <h3 className="text-2xl font-bold text-emerald-800">Order Placed Successfully!</h3>
                            <p className="text-emerald-600">Your order has been submitted to the shop. You can track it in Order History.</p>
                        </CardContent>
                    </Card>
                ) : cart.length === 0 ? (
                    <Card className="border-dashed border-2">
                        <CardContent className="p-12 text-center">
                            <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-bold text-gray-600">Your cart is empty</h3>
                            <p className="text-gray-500">Add products to get started</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="space-y-4">
                            {cart.map(item => (
                                <Card key={item.product.id} className="border-gray-200">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-4">
                                            {/* Product Image */}
                                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                {item.product.image_url ? (
                                                    <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-2xl">
                                                        {item.product.category === 'fertilizer' ? '🌿' : item.product.category === 'pesticide' ? '🧴' : item.product.category === 'seeds' ? '🌱' : '📦'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    {getCategoryIcon(item.product.category)}
                                                    <h3 className="font-bold text-gray-800">{getShortName(item.product)}</h3>
                                                </div>
                                                {item.product.seller_name && (
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Store className="h-3 w-3" /> {item.product.seller_name}
                                                    </p>
                                                )}
                                                <p className="text-sm text-green-700 font-bold">₹{item.product.price} each</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => updateCartQuantity(item.product.id, -1)}
                                                        className="h-8 w-8 p-0 text-gray-700"
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="font-bold w-8 text-center text-gray-800">{item.quantity}</span>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => updateCartQuantity(item.product.id, 1)}
                                                        className="h-8 w-8 p-0 text-gray-700"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <p className="font-bold text-lg w-24 text-right text-gray-800">
                                                    ₹{(item.product.price * item.quantity).toLocaleString()}
                                                </p>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <Card className="bg-gradient-to-r from-green-600 to-emerald-700 border-none shadow-xl">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-green-100 text-sm">Total Amount</p>
                                        <p className="text-4xl font-bold text-white">₹{cartTotal.toLocaleString()}</p>
                                        <p className="text-green-200 text-sm">{cartItemCount} item(s) • {Object.keys(
                                            cart.reduce((acc, item) => ({ ...acc, [item.product.user_id]: true }), {} as Record<number, boolean>)
                                        ).length} shop(s)</p>
                                    </div>
                                    <Button
                                        onClick={placeOrder}
                                        disabled={placingOrder}
                                        className="bg-white text-green-700 hover:bg-green-50 font-bold px-8 py-6 text-lg"
                                    >
                                        {placingOrder ? "Placing..." : "Place Order"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        );
    }

    // ===========================
    //  MAIN MARKET VIEW
    // ===========================
    return (
        <div className="space-y-6 p-2">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/farmer">
                        <Button variant="outline" size="sm" className="border-gray-300 text-gray-700">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-green-900">Buy Fertilizers & More</h1>
                        <p className="text-gray-500">Browse products from local shops</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowHistory(true)}
                        className="flex items-center gap-2 border-gray-300 text-gray-700"
                    >
                        <History className="h-4 w-4" /> Order History
                    </Button>
                    <Button
                        onClick={() => setShowCart(true)}
                        className="bg-green-600 hover:bg-green-700 text-white relative"
                    >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Cart
                        {cartItemCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                {cartItemCount}
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            {/* Search and Shop Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, brand (e.g., DAP, Urea, IFFCO)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none text-gray-800 bg-white"
                    />
                </div>
                {/* Shop Filter */}
                <div className="relative">
                    <select
                        value={selectedShop ?? "all"}
                        onChange={(e) => setSelectedShop(e.target.value === "all" ? null : parseInt(e.target.value))}
                        className="appearance-none pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none text-gray-800 bg-white min-w-[200px]"
                    >
                        <option value="all">All Shops</option>
                        {shops.map(shop => (
                            <option key={shop.id} value={shop.id}>{shop.name}</option>
                        ))}
                    </select>
                    <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (
                    <Button
                        key={cat.id}
                        variant={selectedCategory === cat.id ? "default" : "outline"}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2 whitespace-nowrap ${selectedCategory === cat.id
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "hover:bg-green-50 text-gray-700 border-gray-300"
                            }`}
                    >
                        <cat.icon className="h-4 w-4" />
                        {cat.name}
                    </Button>
                ))}
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="p-12 text-center">
                        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-bold text-gray-600">No products found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map(product => {
                        const inCart = cart.find(item => item.product.id === product.id);
                        return (
                            <Card
                                key={product.id}
                                className="border-gray-200 hover:border-green-300 hover:shadow-lg transition-all group overflow-hidden"
                            >
                                {/* Product Image */}
                                <div className="w-full h-44 bg-gray-50 overflow-hidden relative">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="text-6xl opacity-30">
                                                {product.category === 'fertilizer' ? '🌿' : product.category === 'pesticide' ? '🧴' : product.category === 'seeds' ? '🌱' : '📦'}
                                            </div>
                                        </div>
                                    )}
                                    {/* Category Badge */}
                                    <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getCategoryColor(product.category)}`}>
                                        {getCategoryIcon(product.category)}
                                        {product.category}
                                    </span>
                                    {product.quantity < 10 && (
                                        <span className="absolute top-3 right-3 text-xs bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded-full">Low Stock</span>
                                    )}
                                </div>

                                <CardContent className="p-4">
                                    {/* Product Name */}
                                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-green-700 transition-colors">
                                        {getShortName(product)}
                                    </h3>
                                    {product.brand && (
                                        <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
                                    )}

                                    {/* Shop Name */}
                                    {product.seller_name && (
                                        <p className="text-xs text-blue-600 font-medium flex items-center gap-1 mb-2">
                                            <Store className="h-3 w-3" /> {product.seller_name}
                                        </p>
                                    )}

                                    {/* Price and Stock */}
                                    <div className="flex justify-between items-end mb-3">
                                        <div>
                                            <p className="text-2xl font-bold text-green-700">₹{product.price}</p>
                                            <p className="text-xs text-gray-500">per unit</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-600">{product.quantity} in stock</p>
                                        </div>
                                    </div>

                                    {/* Add to Cart Button */}
                                    <Button
                                        onClick={() => addToCart(product)}
                                        disabled={product.quantity === 0}
                                        className={`w-full ${inCart
                                            ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                                            : "bg-green-600 hover:bg-green-700 text-white"
                                            }`}
                                    >
                                        {inCart ? (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                In Cart ({inCart.quantity})
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add to Cart
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Floating Cart Summary */}
            {cartItemCount > 0 && !showCart && (
                <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-50">
                    <Card className="bg-gradient-to-r from-green-600 to-emerald-700 border-none shadow-2xl">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-green-100 text-sm">{cartItemCount} item(s)</p>
                                    <p className="text-2xl font-bold text-white">₹{cartTotal.toLocaleString()}</p>
                                </div>
                                <Button
                                    onClick={() => setShowCart(true)}
                                    className="bg-white text-green-700 hover:bg-green-50 font-bold"
                                >
                                    View Cart →
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
