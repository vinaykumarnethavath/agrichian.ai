"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Sprout, User, Plus, Trash2, ArrowRight, AlertTriangle,
    CloudRain, Sun, Wind, Droplets, Newspaper, Clock,
    PenSquare, Wallet, ShoppingCart, ChevronDown, ChevronUp
} from "lucide-react";
import Link from "next/link";
import api, { Crop, WeatherData } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import MarketPriceWidget from "@/components/info/MarketPriceWidget";
import NewsWidget from "@/components/info/NewsWidget";

interface LandRecord {
    serial_number: string;
    area: number;
}

interface FarmerProfile {
    farmer_id: string;
    father_husband_name: string;
    gender?: string;
    relation_type?: string;
    house_no?: string;
    street?: string;
    village?: string;
    mandal?: string;
    district?: string;
    state?: string;
    country: string;
    pincode?: string;
    total_area: number;
    aadhaar_last_4: string;
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    land_records: LandRecord[];
    profile_picture_url?: string;
    full_name?: string;
}

export default function FarmerDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<FarmerProfile | null>(null);
    const [crops, setCrops] = useState<Crop[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [showProfileDetails, setShowProfileDetails] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Refs for the form
    const fullNameRef = useRef<HTMLInputElement>(null);
    const farmerIdRef = useRef<HTMLInputElement>(null);
    const fatherRef = useRef<HTMLInputElement>(null);
    const houseNoRef = useRef<HTMLInputElement>(null);
    const streetRef = useRef<HTMLInputElement>(null);
    const villageRef = useRef<HTMLInputElement>(null);
    const mandalRef = useRef<HTMLInputElement>(null);
    const districtRef = useRef<HTMLInputElement>(null);
    const stateRef = useRef<HTMLInputElement>(null);
    const countryRef = useRef<HTMLInputElement>(null);
    const pincodeRef = useRef<HTMLInputElement>(null);
    const aadhaarRef = useRef<HTMLInputElement>(null);
    const bankRef = useRef<HTMLInputElement>(null);
    const accRef = useRef<HTMLInputElement>(null);
    const ifscRef = useRef<HTMLInputElement>(null);

    const [landRecords, setLandRecords] = useState<LandRecord[]>([{ serial_number: "", area: 0 }]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [gender, setGender] = useState<string>("male");
    const [relationType, setRelationType] = useState<string>("son_of");

    // Add Crop State
    const [isAddCropOpen, setIsAddCropOpen] = useState(false);
    const [newCrop, setNewCrop] = useState({
        name: "",
        area: "",
        sowing_date: new Date().toISOString().split("T")[0],
        expected_harvest_date: "",
        notes: ""
    });
    const [addingCrop, setAddingCrop] = useState(false);

    const handleCreateCrop = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingCrop(true);

        const areaValue = parseFloat(newCrop.area);
        if (isNaN(areaValue) || areaValue <= 0) {
            alert("Please enter a valid area.");
            setAddingCrop(false);
            return;
        }

        // Land utilization validation
        const currentTotalLand = profile?.land_records?.reduce((sum, lr) => sum + (lr.area || 0), 0) || profile?.total_area || 0;
        const currentActiveCropArea = crops.filter(c => c.status === 'Growing').reduce((sum, c) => sum + (c.area || 0), 0);
        const availableLand = currentTotalLand - currentActiveCropArea;
        if (currentTotalLand > 0 && areaValue > availableLand) {
            alert(`Cannot add crop: Area (${areaValue} Ac) exceeds available land (${availableLand.toFixed(2)} Ac).\n\nTotal Land: ${currentTotalLand.toFixed(2)} Ac\nActive Crops: ${currentActiveCropArea.toFixed(2)} Ac\nAvailable: ${availableLand.toFixed(2)} Ac\n\nPlease reduce the crop area or update your land records.`);
            setAddingCrop(false);
            return;
        }

        const payload = {
            ...newCrop,
            area: areaValue,
            expected_harvest_date: newCrop.expected_harvest_date || null,
            sowing_date: newCrop.sowing_date || new Date().toISOString().split("T")[0]
        };

        try {
            await api.post("/crops", payload);
            setIsAddCropOpen(false);
            setNewCrop({
                name: "",
                area: "",
                sowing_date: new Date().toISOString().split("T")[0],
                expected_harvest_date: "",
                notes: ""
            });
            fetchData();
        } catch (error: any) {
            console.error("Create crop error:", error.response?.data || error);
            const msg = error.response?.data?.detail
                ? (Array.isArray(error.response.data.detail)
                    ? error.response.data.detail.map((e: any) => e.msg).join(", ")
                    : error.response.data.detail)
                : "Failed to create crop";
            alert(msg);
        } finally {
            setAddingCrop(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const profileRes = await api.get("/farmer/profile");
            setProfile(profileRes.data);
            setShowForm(false);

            const cropsRes = await api.get("/crops");
            setCrops(cropsRes.data);

            // Fetch weather
            try {
                const weatherRes = await api.get('/weather/');
                setWeather(weatherRes.data);
            } catch (e) {
                console.error("Failed to load weather", e);
            }

            setLastUpdated(new Date());
        } catch (err: any) {
            if (err.response?.status === 404) {
                setShowForm(true);
            } else {
                console.error("Error fetching data", err);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddLand = () => {
        setLandRecords([...landRecords, { serial_number: "", area: 0 }]);
    };

    const handleRemoveLand = (index: number) => {
        const newRecords = landRecords.filter((_, i) => i !== index);
        setLandRecords(newRecords);
    };

    const handleLandChange = (index: number, field: keyof LandRecord, value: string | number) => {
        const newRecords = [...landRecords];
        newRecords[index] = { ...newRecords[index], [field]: value };
        setLandRecords(newRecords);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setUploadingImage(true);
        try {
            const { data } = await api.post("/upload", formData, {
                headers: { "Content-Type": undefined },
            });
            setUploadedImageUrl(data.url);
        } catch (err: any) {
            alert("Failed to upload image");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmitProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            full_name: fullNameRef.current?.value || user?.full_name || "",
            profile_picture_url: uploadedImageUrl || profile?.profile_picture_url || "",
            farmer_id: farmerIdRef.current?.value || "",
            father_husband_name: fatherRef.current?.value || "",
            gender: gender,
            relation_type: relationType,
            house_no: houseNoRef.current?.value || "",
            street: streetRef.current?.value || "",
            village: villageRef.current?.value || "",
            mandal: mandalRef.current?.value || "",
            district: districtRef.current?.value || "",
            state: stateRef.current?.value || "",
            country: countryRef.current?.value || "India",
            pincode: pincodeRef.current?.value || "",
            total_area: landRecords.reduce((acc, curr) => acc + (curr.area || 0), 0),
            aadhaar_last_4: aadhaarRef.current?.value || "",
            bank_name: bankRef.current?.value || "",
            account_number: accRef.current?.value || "",
            ifsc_code: ifscRef.current?.value || "",
        };

        try {
            await api.post("/farmer/profile", data);
            for (const lr of landRecords) {
                if (lr.serial_number && lr.area > 0) {
                    await api.post("/farmer/land-records", lr);
                }
            }
            fetchData();
        } catch (err: any) {
            alert("Failed to save profile");
        }
    };

    // Helper: Get season from sowing date
    const getSeason = (sowingDate: string) => {
        const month = new Date(sowingDate).getMonth() + 1; // 1-12
        const year = new Date(sowingDate).getFullYear();
        if (month >= 6 && month <= 10) return `Kharif ${year}`;
        if (month >= 11 || month <= 2) return `Rabi ${year}`;
        return `Zaid ${year}`;
    };

    // Helper: Simple crop health based on days since sowing
    const getCropHealth = (sowingDate: string) => {
        const daysSinceSowing = Math.floor((Date.now() - new Date(sowingDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceSowing < 30) return { label: 'Healthy', color: 'text-green-600', bg: 'bg-green-100', icon: '🟢' };
        if (daysSinceSowing < 90) return { label: 'Healthy', color: 'text-green-600', bg: 'bg-green-100', icon: '🟢' };
        if (daysSinceSowing < 150) return { label: 'Monitor', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '🟡' };
        return { label: 'Monitor', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '🟡' };
    };

    // Helper: Get upcoming activities
    const getUpcomingActivities = () => {
        const activities: { text: string; daysLeft: number; type: string }[] = [];
        activeCrops.forEach(crop => {
            if (crop.expected_harvest_date) {
                const daysLeft = Math.ceil((new Date(crop.expected_harvest_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (daysLeft > 0 && daysLeft <= 30) {
                    activities.push({ text: `Harvest ${crop.name} in ${daysLeft} days`, daysLeft, type: 'harvest' });
                }
            }
            // Simple fertilizer reminder: 45 days after sowing
            const daysSinceSowing = Math.floor((Date.now() - new Date(crop.sowing_date).getTime()) / (1000 * 60 * 60 * 24));
            const nextFertilizerDay = 45 - (daysSinceSowing % 45);
            if (nextFertilizerDay <= 7) {
                activities.push({ text: `Apply fertilizer to ${crop.name} in ${nextFertilizerDay} days`, daysLeft: nextFertilizerDay, type: 'fertilizer' });
            }
        });
        return activities.sort((a, b) => a.daysLeft - b.daysLeft);
    };

    // Computed values
    const farmerDisplayName = profile?.full_name || user?.full_name || "Farmer";
    const relationLabel = profile?.relation_type === "wife_of" ? "W/o" : "S/o";
    const relationName = profile?.father_husband_name || "";
    const activeCrops = crops.filter(c => c.status === 'Growing');
    const activeCropNames = activeCrops.map(c => c.name);
    const totalLandArea = profile?.land_records?.reduce((sum, lr) => sum + (lr.area || 0), 0) || profile?.total_area || 0;
    const activeCropArea = activeCrops.reduce((sum, c) => sum + (c.area || 0), 0);
    const remainingLand = totalLandArea - activeCropArea;
    const utilizationPercent = totalLandArea > 0 ? Math.min((activeCropArea / totalLandArea) * 100, 100) : 0;
    const upcomingActivities = getUpcomingActivities();

    if (loading) return <div className="p-8 text-green-600 font-bold animate-pulse">Loading dashboard...</div>;

    // ─── PROFILE CREATION FORM ─────────────────────────────
    if (showForm && !profile) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 p-4">
                <div className="bg-white rounded-2xl border-2 border-green-100 shadow-xl overflow-hidden">
                    <div className="bg-green-600 p-6 text-white">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <User className="h-6 w-6" />
                            Complete Your Farmer Profile
                        </h2>
                        <p className="text-green-100 text-sm">Please provide your details to manage your crops and transactions.</p>
                    </div>

                    <form onSubmit={handleSubmitProfile} className="p-8 space-y-8">
                        {/* Personal Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-green-900 border-l-4 border-green-500 pl-2">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Full Name</label>
                                    <input ref={fullNameRef} defaultValue={user?.full_name} required className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="Your Name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Profile Picture</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                        />
                                        {uploadingImage && <span className="text-sm text-green-600 animate-pulse">Uploading...</span>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Farmer ID / Registration No.</label>
                                    <input ref={farmerIdRef} required className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="AGRI-123456" />
                                </div>
                                {/* Gender Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Gender</label>
                                    <div className="flex gap-4 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="gender" value="male" checked={gender === "male"} onChange={() => setGender("male")} className="accent-green-600 w-4 h-4" />
                                            <span className="text-sm font-medium text-gray-700">Male</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="gender" value="female" checked={gender === "female"} onChange={() => setGender("female")} className="accent-green-600 w-4 h-4" />
                                            <span className="text-sm font-medium text-gray-700">Female</span>
                                        </label>
                                    </div>
                                </div>
                                {/* Relation Type */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Relation Type</label>
                                    <select
                                        value={relationType}
                                        onChange={(e) => setRelationType(e.target.value)}
                                        className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black bg-white"
                                    >
                                        <option value="son_of">Son of (S/o)</option>
                                        <option value="wife_of">Wife of (W/o)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">{relationType === "wife_of" ? "Husband Name" : "Father Name"}</label>
                                    <input ref={fatherRef} required className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder={relationType === "wife_of" ? "Husband's Name" : "Father's Name"} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Aadhaar (Last 4 Digits)</label>
                                    <input ref={aadhaarRef} required maxLength={4} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="XXXX" />
                                </div>
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-green-900 border-l-4 border-green-500 pl-2">Address Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">House / Flat No.</label>
                                    <input ref={houseNoRef} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="#123" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-gray-700">Street Name</label>
                                    <input ref={streetRef} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="Main Street" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Village</label>
                                    <input ref={villageRef} required className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="Village Name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Mandal</label>
                                    <input ref={mandalRef} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="Mandal" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">District</label>
                                    <input ref={districtRef} required className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="District" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">State</label>
                                    <input ref={stateRef} required className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="State" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Country</label>
                                    <input ref={countryRef} defaultValue="India" className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Pincode</label>
                                    <input ref={pincodeRef} required className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="500001" />
                                </div>
                            </div>
                        </div>

                        {/* Land Records */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h3 className="text-lg font-bold text-green-900 border-l-4 border-green-500 pl-2">Land Records</h3>
                                <Button type="button" onClick={handleAddLand} variant="outline" size="sm" className="text-green-600 border-green-200">
                                    <Plus className="h-4 w-4 mr-1" /> Add Land Piece
                                </Button>
                            </div>
                            {landRecords.map((lr, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="col-span-6 space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Serial No. / Khasra No.</label>
                                        <input
                                            value={lr.serial_number}
                                            onChange={(e) => handleLandChange(index, "serial_number", e.target.value)}
                                            className="w-full border-2 border-white rounded-lg p-2 focus:border-green-500 outline-none text-black text-sm"
                                            placeholder="e.g. 102/4"
                                        />
                                    </div>
                                    <div className="col-span-4 space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Area (in Acres)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={lr.area}
                                            onChange={(e) => handleLandChange(index, "area", parseFloat(e.target.value))}
                                            className="w-full border-2 border-white rounded-lg p-2 focus:border-green-500 outline-none text-black text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2 pb-1">
                                        <Button type="button" onClick={() => handleRemoveLand(index)} variant="ghost" className="text-red-500 hover:bg-red-50 w-full">
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bank Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-green-900 border-l-4 border-green-500 pl-2 border-b pb-2">Bank Account Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Bank Name</label>
                                    <input ref={bankRef} required className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="State Bank of India" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Account Number</label>
                                    <input ref={accRef} required className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="000000000000" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">IFSC Code</label>
                                    <input ref={ifscRef} required className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none text-black" placeholder="SBIN0001234" />
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-bold shadow-lg shadow-green-200">
                            Save Profile & Access Dashboard
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    // ─── MAIN DASHBOARD ────────────────────────────────────
    return (
        <div className="space-y-6 p-2 max-w-5xl mx-auto">

            {/* ═══════════════════════════════════════════════════
                1. HEADER SECTION
               ═══════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Sprout size={100} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {profile?.profile_picture_url ? (
                            <img src={profile.profile_picture_url} alt="Profile" className="h-16 w-16 rounded-full border-4 border-white/30 object-cover" />
                        ) : (
                            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                                <User size={32} className="text-white" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                {farmerDisplayName} {relationName && <span className="font-medium text-green-100">{relationLabel} {relationName}</span>}
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                                    🆔 {profile?.farmer_id}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowForm(true)}
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm self-start"
                    >
                        <PenSquare className="h-4 w-4 mr-2" />
                        Edit Profile
                    </Button>
                </div>

                {/* Compact Profile Details (Expandable) */}
                <div className="mt-4 pt-3 border-t border-white/15">
                    <button
                        onClick={() => setShowProfileDetails(!showProfileDetails)}
                        className="text-green-200 text-sm flex items-center gap-1 hover:text-white transition-colors"
                    >
                        👤 Show Profile Details
                        {showProfileDetails ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                        <span className="ml-2 text-xs opacity-70">{showProfileDetails ? 'Hide' : 'Show'} Details</span>
                    </button>

                    {showProfileDetails && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm animate-in slide-in-from-top-2">
                            {profile?.land_records && profile.land_records.length > 0 && (
                                <div className="col-span-2 bg-white/10 rounded-lg p-3">
                                    <p className="text-green-200 text-xs font-bold uppercase mb-2">Land Plots</p>
                                    {profile.land_records.map((lr, idx) => (
                                        <div key={idx} className="flex justify-between text-xs">
                                            <span>Khasra: {lr.serial_number}</span>
                                            <span className="font-bold">{lr.area} Ac</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="bg-white/10 rounded-lg p-3">
                                <p className="text-green-200 text-xs font-bold uppercase">Full Address</p>
                                <p className="text-xs mt-1">
                                    {[profile?.house_no, profile?.street, profile?.village, profile?.mandal, profile?.district, profile?.state, profile?.pincode].filter(Boolean).join(', ')}
                                </p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <p className="text-green-200 text-xs font-bold uppercase">Bank</p>
                                <p className="text-xs mt-1 font-bold">{profile?.bank_name}</p>
                                <p className="text-xs opacity-70">A/C: {profile?.account_number?.replace(/\d(?=\d{4})/g, "*")}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                 QUICK ACTION BUTTONS (Minimal)
               ═══════════════════════════════════════════════════ */}
            <div className="flex gap-3 overflow-x-auto pb-1">
                <Button
                    onClick={() => setIsAddCropOpen(true)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-1" /> Add Crop
                </Button>
                <Link href="/dashboard/farmer/crops">
                    <Button size="sm" variant="outline" className="border-gray-200 text-gray-700 rounded-full hover:bg-gray-50">
                        <Wallet className="h-4 w-4 mr-1" /> Add Expense
                    </Button>
                </Link>
                <Link href="/dashboard/farmer/market">
                    <Button size="sm" variant="outline" className="border-gray-200 text-gray-700 rounded-full hover:bg-gray-50">
                        <ShoppingCart className="h-4 w-4 mr-1" /> Buy Fertilizer
                    </Button>
                </Link>
            </div>


            {/* ═══════════════════════════════════════════════════
                2. IMPORTANT ALERTS (from Weather)
               ═══════════════════════════════════════════════════ */}
            {weather && weather.alerts && weather.alerts.length > 0 && (
                <div className="space-y-3">
                    {weather.alerts.map((alert, idx) => (
                        <div
                            key={idx}
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 shadow-sm ${alert.type === 'warning'
                                ? 'bg-red-50 border-red-200'
                                : 'bg-amber-50 border-amber-200'
                                }`}
                        >
                            <div className={`p-2 rounded-lg ${alert.type === 'warning' ? 'bg-red-100' : 'bg-amber-100'}`}>
                                <AlertTriangle className={`h-6 w-6 ${alert.type === 'warning' ? 'text-red-600' : 'text-amber-600'}`} />
                            </div>
                            <div>
                                <h4 className={`font-bold text-lg ${alert.type === 'warning' ? 'text-red-800' : 'text-amber-800'}`}>
                                    {alert.title}
                                </h4>
                                <p className={`text-sm ${alert.type === 'warning' ? 'text-red-600' : 'text-amber-600'}`}>
                                    {alert.message}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Farming Advice from Weather */}
                    {weather.advice && weather.advice.length > 0 && weather.advice.map((tip, idx) => (
                        <div key={`advice-${idx}`} className="flex items-start gap-4 p-4 rounded-xl border-2 bg-green-50 border-green-200 shadow-sm">
                            <div className="p-2 rounded-lg bg-green-100">
                                <Sprout className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-green-800">Farming Advice</h4>
                                <p className="text-sm text-green-600">{tip}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}


            {/* ═══════════════════════════════════════════════════
                LAND UTILIZATION (Compact Bar)
               ═══════════════════════════════════════════════════ */}
            <Card className="border border-gray-100 shadow-sm">
                <CardContent className="p-5">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            📊 Land Utilization
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-green-700">{utilizationPercent.toFixed(0)}%</span>
                            <Button
                                onClick={() => setShowForm(true)}
                                variant="outline"
                                size="sm"
                                className="border-green-200 text-green-700 hover:bg-green-50"
                            >
                                <PenSquare className="h-3 w-3 mr-1" /> Edit Land
                            </Button>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-3 overflow-hidden">
                        <div
                            className={`h-4 rounded-full transition-all duration-700 ${activeCropArea <= totalLandArea ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-red-500'}`}
                            style={{ width: `${utilizationPercent}%` }}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Total Land</p>
                            <p className="font-bold text-gray-800">{totalLandArea.toFixed(2)} Ac</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Active Crops</p>
                            <p className="font-bold text-green-700">{activeCropArea.toFixed(2)} Ac</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Available</p>
                            <p className={`font-bold ${remainingLand < 0 ? 'text-red-600' : 'text-amber-700'}`}>{remainingLand.toFixed(2)} Ac</p>
                        </div>
                    </div>
                </CardContent>
            </Card>


            {/* ═══════════════════════════════════════════════════
                3. ACTIVE CROPS (Top 3)
               ═══════════════════════════════════════════════════ */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Sprout className="h-5 w-5 text-green-600" />
                        Active Crops
                    </h2>
                    <Link href="/dashboard/farmer/crops">
                        <Button variant="ghost" size="sm" className="text-green-700 hover:bg-green-50">
                            View All Crops <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </div>

                {activeCrops.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
                        <Sprout className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="font-medium">{crops.length === 0 ? 'No crops added yet.' : 'No active crops currently growing.'}</p>
                        <p className="text-sm mt-1">Start tracking your farming by adding a new crop.</p>
                        <Button onClick={() => setIsAddCropOpen(true)} className="mt-4 bg-green-600 hover:bg-green-700 text-white">
                            <Plus className="h-4 w-4 mr-2" /> Add Your First Crop
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {activeCrops.slice(0, 3).map(crop => (
                            <Link key={crop.id} href={`/dashboard/farmer/crops/${crop.id}`} className="block group">
                                <Card className="border border-gray-100 shadow-sm hover:shadow-lg hover:border-green-200 transition-all h-full">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-800 group-hover:text-green-700 transition-colors">{crop.name}</h3>
                                                <p className="text-xs text-gray-400">{getSeason(crop.sowing_date)} • {crop.area} Acres</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
                                                    🟢 Growing
                                                </span>
                                                <span className={`${getCropHealth(crop.sowing_date).bg} ${getCropHealth(crop.sowing_date).color} px-2 py-0.5 rounded-full text-[10px] font-bold`}>
                                                    {getCropHealth(crop.sowing_date).icon} {getCropHealth(crop.sowing_date).label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
                                            <div>
                                                <p className="text-xs text-gray-400">Total Cost</p>
                                                <p className="font-bold text-gray-800">₹{(crop.total_cost || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400">Revenue</p>
                                                <p className="font-bold text-gray-800">₹{(crop.total_revenue || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {crop.expected_harvest_date && (
                                            <div className="mt-3 bg-amber-50 text-amber-700 text-xs p-2 rounded-lg text-center font-medium border border-amber-100">
                                                🌾 Harvest expected: {new Date(crop.expected_harvest_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>




            {/* ═══════════════════════════════════════════════════
                5. MARKET PRICES (Active Crops Only)
               ═══════════════════════════════════════════════════ */}
            <div>
                <MarketPriceWidget filterCrops={activeCropNames} />
            </div>


            {/* ═══════════════════════════════════════════════════
                6. WEATHER (Compact)
               ═══════════════════════════════════════════════════ */}
            {weather && (
                <Card className="bg-gradient-to-r from-blue-500 to-sky-600 text-white border-none shadow-lg overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                    {weather.condition?.toLowerCase().includes('rain') ? (
                                        <CloudRain className="h-8 w-8" />
                                    ) : weather.condition?.toLowerCase().includes('cloud') ? (
                                        <Wind className="h-8 w-8" />
                                    ) : (
                                        <Sun className="h-8 w-8" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black">{Math.round(weather.temperature)}°</span>
                                        <span className="text-lg font-medium text-blue-100">{weather.condition}</span>
                                    </div>
                                    <p className="text-blue-100 text-sm flex items-center gap-3 mt-1">
                                        <span className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {weather.humidity}%</span>
                                        <span className="flex items-center gap-1"><Wind className="h-3 w-3" /> {weather.wind_speed} km/h</span>
                                        {weather.rainfall_mm > 0 && <span className="flex items-center gap-1"><CloudRain className="h-3 w-3" /> {weather.rainfall_mm}mm</span>}
                                    </p>
                                </div>
                            </div>

                            {/* Mini forecast */}
                            <div className="hidden md:flex gap-3">
                                {weather.forecast.slice(0, 3).map((day, idx) => (
                                    <div key={idx} className="text-center bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                                        <p className="text-xs text-blue-200">{day.day}</p>
                                        <p className="font-bold text-lg">{Math.round(day.temp)}°</p>
                                        {day.rain_prob > 30 && <p className="text-xs text-blue-200">🌧 {day.rain_prob}%</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}


            {/* ═══════════════════════════════════════════════════
                UPCOMING ACTIVITY REMINDERS
               ═══════════════════════════════════════════════════ */}
            {upcomingActivities.length > 0 && (
                <Card className="border border-amber-200 shadow-sm bg-amber-50/50">
                    <CardContent className="p-5">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                            📅 Upcoming Activities
                        </h3>
                        <div className="space-y-2">
                            {upcomingActivities.slice(0, 3).map((activity, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-amber-100">
                                    <span className="text-lg">{activity.type === 'harvest' ? '🌾' : '💧'}</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-800">{activity.text}</p>
                                    </div>
                                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                                        {activity.daysLeft}d
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}


            {/* ═══════════════════════════════════════════════════
                7. IMPORTANT NEWS (Scrollable)
               ═══════════════════════════════════════════════════ */}
            <div>
                <NewsWidget limit={5} />
            </div>


            {/* ═══════════════════════════════════════════════════
                ADD CROP MODAL
               ═══════════════════════════════════════════════════ */}
            <Modal
                isOpen={isAddCropOpen}
                onClose={() => setIsAddCropOpen(false)}
                title="Add New Crop"
            >
                <form onSubmit={handleCreateCrop} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Crop Name</label>
                        <input
                            required
                            placeholder="e.g. Wheat, Rice, Cotton"
                            className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                            value={newCrop.name}
                            onChange={(e) => setNewCrop({ ...newCrop, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Area (Acres)</label>
                        <input
                            type="number"
                            step="0.1"
                            required
                            placeholder="0.0"
                            className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                            value={newCrop.area}
                            onChange={(e) => setNewCrop({ ...newCrop, area: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Sowing Date</label>
                            <input
                                type="date"
                                required
                                className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                                value={newCrop.sowing_date}
                                onChange={(e) => setNewCrop({ ...newCrop, sowing_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Harvest (Est.)</label>
                            <input
                                type="date"
                                required
                                className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                                value={newCrop.expected_harvest_date}
                                onChange={(e) => setNewCrop({ ...newCrop, expected_harvest_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea
                            placeholder="Any specific details..."
                            className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                            value={newCrop.notes}
                            onChange={(e) => setNewCrop({ ...newCrop, notes: e.target.value })}
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={addingCrop}
                        className="w-full bg-green-600 hover:bg-green-700 text-white mt-4"
                    >
                        {addingCrop ? "Adding..." : "Add Crop"}
                    </Button>
                </form>
            </Modal>

            {/* Edit Profile Modal */}
            {showForm && profile && (
                <Modal
                    isOpen={showForm}
                    onClose={() => setShowForm(false)}
                    title="Edit Profile"
                >
                    <form onSubmit={handleSubmitProfile} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">Full Name</label>
                                <input ref={fullNameRef} defaultValue={profile.full_name || user?.full_name} required className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">Farmer ID</label>
                                <input ref={farmerIdRef} defaultValue={profile.farmer_id} required className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">Gender</label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">Relation Type</label>
                                <select
                                    value={relationType}
                                    onChange={(e) => setRelationType(e.target.value)}
                                    className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
                                >
                                    <option value="son_of">Son of (S/o)</option>
                                    <option value="wife_of">Wife of (W/o)</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">{relationType === "wife_of" ? "Husband Name" : "Father Name"}</label>
                            <input ref={fatherRef} defaultValue={profile.father_husband_name} required className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">Village</label>
                                <input ref={villageRef} defaultValue={profile.village} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">District</label>
                                <input ref={districtRef} defaultValue={profile.district} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">State</label>
                                <input ref={stateRef} defaultValue={profile.state} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500">Aadhaar (Last 4)</label>
                                <input ref={aadhaarRef} defaultValue={profile.aadhaar_last_4} maxLength={4} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Profile Picture</label>
                            <input type="file" accept="image/*" onChange={handleFileUpload}
                                className="w-full border rounded-lg p-2 text-sm file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700"
                            />
                        </div>
                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
                            Save Changes
                        </Button>
                    </form>
                </Modal>
            )}
        </div>
    );
}
