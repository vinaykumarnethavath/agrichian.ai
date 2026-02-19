"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, RefreshCcw, ChevronLeft, ChevronRight, Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import api, { MarketPrice } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function MarketPricesPage() {
    const [prices, setPrices] = useState<MarketPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'price_high' | 'price_low'>('name');
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const fetchPrices = async () => {
        setLoading(true);
        try {
            const res = await api.get('/market/prices');
            setPrices(res.data);
            setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        } catch (err) {
            console.error("Failed to fetch market prices", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
    }, []);

    const scrollMarkets = (cropName: string, direction: 'left' | 'right') => {
        const ref = scrollRefs.current[cropName];
        if (ref) {
            ref.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
        }
    };

    const filteredPrices = prices
        .filter(p => p.crop_name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'price_high') return b.market_price - a.market_price;
            if (sortBy === 'price_low') return a.market_price - b.market_price;
            return a.crop_name.localeCompare(b.crop_name);
        });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Live Market Prices</h1>
                    <p className="text-sm text-gray-500">Compare prices across nearby mandis. Find the best price for your crops.</p>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
                            Updated: {lastUpdated}
                        </span>
                    )}
                    <Button onClick={fetchPrices} variant="outline" size="sm" className="gap-2">
                        <RefreshCcw className="h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            {/* Search & Sort */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search crop (e.g. Rice, Cotton, Wheat...)"
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                    <select
                        className="border rounded-lg px-3 py-2.5 text-sm bg-white cursor-pointer focus:ring-2 focus:ring-green-500 outline-none"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                    >
                        <option value="name">Sort: A–Z</option>
                        <option value="price_high">Price: High → Low</option>
                        <option value="price_low">Price: Low → High</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-48 animate-pulse bg-gray-100 rounded-xl" />
                    ))}
                </div>
            ) : filteredPrices.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No crops found matching &quot;{searchQuery}&quot;</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredPrices.map((crop, idx) => (
                        <Card key={idx} className="hover:shadow-lg transition-shadow overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gray-50/80 border-b">
                                <div className="flex items-center gap-3">
                                    <CardTitle className="text-xl font-bold text-gray-900">{crop.crop_name}</CardTitle>
                                    {crop.msp_comparison === 'above' && (
                                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                                            Above MSP
                                        </span>
                                    )}
                                    {crop.msp_comparison === 'below' && (
                                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200">
                                            Below MSP
                                        </span>
                                    )}
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${crop.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {crop.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    ₹{Math.abs(crop.change)}
                                </span>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {/* Primary Price */}
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-0.5">Best Nearby Price</p>
                                        <p className="text-3xl font-bold text-gray-900">₹{crop.market_price.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">per Quintal</p>
                                    </div>
                                    {crop.msp > 0 && (
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400">MSP (Govt)</p>
                                            <p className="text-sm font-bold text-gray-600">₹{crop.msp.toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Scrollable Nearby Markets */}
                                {crop.markets && crop.markets.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Nearby Markets</p>
                                        <div className="relative">
                                            <button
                                                onClick={() => scrollMarkets(crop.crop_name, 'left')}
                                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 shadow-md rounded-full p-1 border border-gray-200 hover:bg-gray-50 -ml-2"
                                            >
                                                <ChevronLeft className="h-3.5 w-3.5 text-gray-600" />
                                            </button>
                                            <div
                                                ref={el => { scrollRefs.current[crop.crop_name] = el; }}
                                                className="flex gap-2.5 overflow-x-auto px-3 py-1"
                                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                            >
                                                {crop.markets.map((market: any, mIdx: number) => (
                                                    <div
                                                        key={mIdx}
                                                        className="flex-shrink-0 bg-gradient-to-b from-white to-gray-50 border border-gray-150 rounded-xl px-4 py-3 min-w-[160px] hover:border-green-300 hover:shadow-sm transition-all cursor-pointer"
                                                    >
                                                        <p className="text-xs font-bold text-gray-800 truncate">{market.market_name}</p>
                                                        <p className="text-lg font-bold text-gray-900 mt-1">₹{market.price.toLocaleString()}</p>
                                                        <div className="flex items-center justify-between mt-1.5">
                                                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{market.distance_km} km</span>
                                                            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${market.trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                                                                {market.trend === 'up' ? '↑' : '↓'}₹{Math.abs(market.change)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => scrollMarkets(crop.crop_name, 'right')}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 shadow-md rounded-full p-1 border border-gray-200 hover:bg-gray-50 -mr-2"
                                            >
                                                <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Decision Hint */}
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                                    <p className="text-xs text-blue-700 font-medium">
                                        💡 {crop.trend === 'up' ? 'Prices increasing. Consider waiting for better rates.' : 'Prices declining. Check MSP before selling.'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
