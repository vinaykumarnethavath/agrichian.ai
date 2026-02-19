from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func, col
from datetime import datetime, timedelta
import random

from ..database import get_session
from ..models import ShopOrder, ShopOrderItem, Product, User, CropExpense, Crop
from ..deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/expenses")
async def get_expense_analytics(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.role != "farmer":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Aggregate expenses by category
    query = select(CropExpense.category, func.sum(CropExpense.total_cost))\
        .join(Crop, Crop.id == CropExpense.crop_id)\
        .where(Crop.user_id == current_user.id)\
        .group_by(CropExpense.category)
        
    results = await session.exec(query)
    # Handle case where results might be empty or valid
    data = [{"category": row[0], "amount": row[1]} for row in results.all()]
    return data

@router.get("/market-trends")
async def get_market_trends():
    """Returns mock market trend data"""
    # In a real app, this would come from an external API or database
    trends = [
        {"crop": "Wheat", "price": 2250, "unit": "q", "change": 2.5, "trend": "up"},
        {"crop": "Rice", "price": 1980, "unit": "q", "change": -1.2, "trend": "down"},
        {"crop": "Cotton", "price": 6100, "unit": "q", "change": 0.5, "trend": "stable"},
        {"crop": "Sugarcane", "price": 310, "unit": "ton", "change": 0.0, "trend": "stable"},
        {"crop": "Chilli", "price": 18500, "unit": "q", "change": 5.0, "trend": "up"},
        {"crop": "Maize", "price": 2100, "unit": "q", "change": -0.8, "trend": "down"}
    ]
    return trends

@router.get("/recommendations")
async def get_recommendations():
    """Returns mock crop recommendations"""
    # Logic could be based on season, location, soil type etc.
    recommendations = [
        {"name": "Mustard", "reason": "High demand expected next season. Suitable for current weather."},
        {"name": "Chickpea", "reason": "Low water requirement, good for soil nitrogen fixation."},
        {"name": "Sunflower", "reason": "Short duration cash crop with good market price."}
    ]
    return recommendations

@router.get("/shop/overview")
async def get_shop_overview(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.role != "shop":
        raise HTTPException(status_code=403, detail="Not authorized")

    # 1. Total Products
    products_query = select(func.count(Product.id)).where(Product.user_id == current_user.id)
    products_count = (await session.exec(products_query)).first() or 0

    # 2. Total Stock (Sum of quantity)
    stock_query = select(func.sum(Product.quantity)).where(Product.user_id == current_user.id)
    total_stock = (await session.exec(stock_query)).first() or 0

    # 3. Today's Sales
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    sales_query = select(func.sum(ShopOrder.total_amount))\
        .where(ShopOrder.shop_id == current_user.id)\
        .where(ShopOrder.created_at >= today_start)
    today_sales = (await session.exec(sales_query)).first() or 0.0

    # 4. Monthly Revenue
    month_start = today_start.replace(day=1)
    revenue_query = select(func.sum(ShopOrder.total_amount))\
        .where(ShopOrder.shop_id == current_user.id)\
        .where(ShopOrder.created_at >= month_start)
    month_revenue = (await session.exec(revenue_query)).first() or 0.0

    # 5. Low Stock
    low_stock_query = select(func.count(Product.id))\
        .where(Product.user_id == current_user.id)\
        .where(Product.quantity < Product.low_stock_threshold)
    low_stock_count = (await session.exec(low_stock_query)).first() or 0

    return {
        "total_products": products_count,
        "total_stock": total_stock,
        "today_sales": today_sales,
        "month_revenue": month_revenue,
        "low_stock_count": low_stock_count
    }

@router.get("/shop/sales-trend")
async def get_sales_trend(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Returns daily sales for the last N days"""
    if current_user.role != "shop":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # SQLite doesn't have great date truncation, so we fetch and aggregate in python for MVP
    # For production Postgres, use date_trunc
    query = select(ShopOrder.created_at, ShopOrder.total_amount)\
        .where(ShopOrder.shop_id == current_user.id)\
        .where(ShopOrder.created_at >= start_date)\
        .order_by(ShopOrder.created_at)
        
    results = await session.exec(query)
    orders = results.all()
    
    # Aggregate by date
    daily_sales = {}
    for i in range(days):
        date_str = (datetime.utcnow() - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
        daily_sales[date_str] = 0.0
        
    for created_at, amount in orders:
        date_key = created_at.strftime("%Y-%m-%d")
        if date_key in daily_sales:
            daily_sales[date_key] += amount
            
    return [{"date": k, "sales": v} for k, v in daily_sales.items()]

@router.get("/shop/category-distribution")
async def get_category_distribution(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.role != "shop":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    query = select(Product.category, func.sum(Product.quantity))\
        .where(Product.user_id == current_user.id)\
        .group_by(Product.category)
        
    results = await session.exec(query)
    return [{"category": row[0], "stock": row[1]} for row in results.all()]

@router.get("/customers")
async def get_shop_customers(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Returns a list of farmers who have purchased from this shop, 
    ordered by total spend.
    """
    if current_user.role != "shop":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Group orders by farmer_id
    # We need farmer name, location (if available in User model), total spent, order count
    # Since User model is simple, we might just get ID and Name (if we join)
    # For now, let's group by farmer_id and sum total_amount
    
    query = select(
            ShopOrder.farmer_id, 
            func.count(ShopOrder.id).label("order_count"), 
            func.sum(ShopOrder.final_amount).label("total_spent"),
            func.max(ShopOrder.created_at).label("last_order")
        )\
        .where(ShopOrder.shop_id == current_user.id)\
        .where(ShopOrder.farmer_id != None)\
        .group_by(ShopOrder.farmer_id)\
        .order_by(col("total_spent").desc())
        
    results = await session.exec(query)
    customers = []
    for row in results.all():
        farmer_id, count, spent, last_date = row
        # Fetch details (could be optimized with join)
        farmer_user = await session.get(User, farmer_id)
        name = farmer_user.full_name if farmer_user else f"Farmer #{farmer_id}"
        
        customers.append({
            "id": farmer_id,
            "name": name,
            "full_name": name, # Alias for frontend
            "total_orders": count,
            "total_spent": spent,
            "last_order_date": last_date
        })
        
    return customers

@router.get("/farmer/overview")
async def get_farmer_overview(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.role != "farmer":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # 1. Total Revenue & Profit
    from ..models import Crop
    financials_query = select(
        func.sum(Crop.total_revenue),
        func.sum(Crop.net_profit),
        func.sum(Crop.actual_yield)
    ).where(Crop.user_id == current_user.id)
    
    financials = (await session.exec(financials_query)).first()
    
    total_revenue = financials[0] or 0.0
    total_profit = financials[1] or 0.0
    total_yield = financials[2] or 0.0
    
    # 2. Active Crops Count
    active_query = select(func.count(Crop.id)).where(Crop.user_id == current_user.id).where(Crop.status == "Growing")
    active_count = (await session.exec(active_query)).first() or 0
    
    return {
        "total_revenue": total_revenue,
        "total_profit": total_profit,
        "total_yield": total_yield,
        "active_crops": active_count
    }

@router.get("/farmer/yield-trend")
async def get_yield_trend(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.role != "farmer":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    from ..models import Crop
    # Aggregate yield by Crop Name
    query = select(Crop.name, func.sum(Crop.actual_yield))\
        .where(Crop.user_id == current_user.id)\
        .where(Crop.status == "Harvested")\
        .group_by(Crop.name)
        
    results = (await session.exec(query)).all()
    
    return [{"name": name, "yield": val} for name, val in results]
