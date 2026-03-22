from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload

from ..database import get_session
from ..models import ShopOrder, ShopOrderCreate, ShopOrderRead, ShopOrderItem, Product, User
from ..deps import get_current_user

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("/", response_model=ShopOrderRead)
async def create_shop_order(
    order_in: ShopOrderCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new multi-item order.
    """
    # 1. Validate User Role (Shop owner creating order for walk-in/farmer, or Farmer buying?)
    # For now, let's assume Shop Owner creates the order (POS style) OR Farmer creates it.
    # If Farmer creates, shop_id must be inferred from products? 
    # Complexity: Multi-shop orders? 
    # Plan: Restrict order to single shop for now or separate orders per shop. 
    # Given the requirements "Shop Dashboard -> Sales/Orders", it implies Shop Owner records it or Farmer buys.
    
    # If User is Farmer, they are buying. If User is Shop, they are selling (POS).
    buyer_id = None
    buyer_name = None
    if current_user.role == "farmer":
        buyer_id = current_user.id
        buyer_name = current_user.full_name
    elif order_in.farmer_id:
        buyer_id = order_in.farmer_id
        # Fetch farmer name
        farmer_user = await session.get(User, order_in.farmer_id)
        buyer_name = farmer_user.full_name if farmer_user else None
        
    # 2. Process Items
    total_amount = 0.0
    db_items = []
    shop_id = None
    
    for item_in in order_in.items:
        product = await session.get(Product, item_in.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item_in.product_id} not found")
        
        if product.quantity < item_in.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {product.name}")
            
        if shop_id is None:
            shop_id = product.user_id
        elif shop_id != product.user_id:
             raise HTTPException(status_code=400, detail="Cannot mix products from different shops in one order")

        product.quantity -= item_in.quantity
        session.add(product)
        
        item_total = product.price * item_in.quantity
        total_amount += item_total
        
        db_item = ShopOrderItem(
            product_id=product.id,
            product_name=product.name,
            quantity=item_in.quantity,
            unit_price=product.price,
            subtotal=item_total
        )
        db_items.append(db_item)
    
    if not shop_id:
         raise HTTPException(status_code=400, detail="No valid products in order")

    final_amount = total_amount - order_in.discount
    if final_amount < 0: final_amount = 0
    
    # Farmer-placed orders start as "pending", shop POS orders are "completed"
    order_status = "pending" if current_user.role == "farmer" else "completed"
    
    db_order = ShopOrder(
        shop_id=shop_id,
        farmer_id=buyer_id,
        farmer_name=buyer_name,
        total_amount=total_amount,
        discount=order_in.discount,
        final_amount=final_amount,
        payment_mode=order_in.payment_mode,
        status=order_status
    )
    session.add(db_order)
    await session.commit()
    await session.refresh(db_order)
    
    for item in db_items:
        item.order_id = db_order.id
        session.add(item)
        
    await session.commit()
    
    statement = select(ShopOrder).where(ShopOrder.id == db_order.id).options(selectinload(ShopOrder.items))
    result = await session.exec(statement)
    return result.one()

@router.get("/shop-orders", response_model=List[ShopOrderRead])
async def read_shop_orders(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.role != "shop": 
         raise HTTPException(status_code=403, detail="Not authorized")

    statement = select(ShopOrder).where(ShopOrder.shop_id == current_user.id).options(selectinload(ShopOrder.items)).order_by(ShopOrder.created_at.desc())
    result = await session.exec(statement)
    return result.all()

@router.put("/{order_id}/status", response_model=ShopOrderRead)
async def update_order_status(
    order_id: int,
    status: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update order status (for shop owners to confirm/dispatch/complete farmer orders)."""
    order = await session.get(ShopOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # Ensure authorization
    if current_user.role == "shop" and order.shop_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "farmer":
        if order.farmer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this order")
        if status != "cancelled":
            raise HTTPException(status_code=403, detail="Farmers can only transition orders to cancelled")
        if order.status != "pending":
            raise HTTPException(status_code=400, detail="Cannot cancel an order that is no longer pending")
    valid_statuses = ["pending", "confirmed", "dispatched", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    order.status = status
    session.add(order)
    await session.commit()
    
    statement = select(ShopOrder).where(ShopOrder.id == order.id).options(selectinload(ShopOrder.items))
    result = await session.exec(statement)
    return result.one()

@router.get("/my-orders", response_model=List[ShopOrderRead])
async def read_my_orders(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    statement = select(ShopOrder).where(ShopOrder.farmer_id == current_user.id).options(selectinload(ShopOrder.items)).order_by(ShopOrder.created_at.desc())
    result = await session.exec(statement)
    return result.all()
