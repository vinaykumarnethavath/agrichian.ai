from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from ..database import get_session
from ..models import Product, ProductCreate, ProductRead, User
from ..deps import get_current_user

router = APIRouter(prefix="/products", tags=["products"])

# Extended read model with seller info
class ProductWithSeller(ProductRead):
    seller_name: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.post("/", response_model=ProductRead)
async def create_product(
    product: ProductCreate, 
    current_user: User = Depends(get_current_user), 
    session: AsyncSession = Depends(get_session)
):
    if current_user.role not in ["shop", "manufacturer", "farmer"]:
        raise HTTPException(status_code=403, detail="Not authorized to sell products")
        
    db_product = Product.from_orm(product)
    db_product.user_id = current_user.id
    
    session.add(db_product)
    await session.commit()
    await session.refresh(db_product)
    return db_product

@router.get("/", response_model=List[ProductWithSeller])
async def read_products(
    category: str = None,
    shop_id: int = None,
    session: AsyncSession = Depends(get_session)
):
    """Get all products, optionally filtered by category or shop. Includes seller name."""
    statement = select(Product, User.full_name).join(User, Product.user_id == User.id)
    if category:
        statement = statement.where(Product.category == category)
    if shop_id:
        statement = statement.where(Product.user_id == shop_id)
    result = await session.exec(statement)
    
    products = []
    for product, seller_name in result:
        p = ProductWithSeller.from_orm(product)
        p.seller_name = seller_name
        products.append(p)
    return products
    
@router.get("/shops", response_model=list)
async def get_shops(session: AsyncSession = Depends(get_session)):
    """Get all shops that have products listed."""
    statement = select(User.id, User.full_name).where(User.role == "shop")
    result = await session.exec(statement)
    shops = [{"id": id, "name": name} for id, name in result]
    return shops

@router.get("/{product_id}", response_model=ProductWithSeller)
async def read_product(
    product_id: int,
    session: AsyncSession = Depends(get_session)
):
    product = await session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    seller = await session.get(User, product.user_id)
    p = ProductWithSeller.from_orm(product)
    p.seller_name = seller.full_name if seller else "Unknown"
    return p

@router.get("/my/all", response_model=List[ProductRead])
async def read_my_products(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    statement = select(Product).where(Product.user_id == current_user.id)
    result = await session.exec(statement)
    return result.all()

@router.put("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int,
    product_update: ProductCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    db_product = await session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    if db_product.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product")
    
    product_data = product_update.dict(exclude_unset=True)
    for key, value in product_data.items():
        setattr(db_product, key, value)
        
    session.add(db_product)
    await session.commit()
    await session.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    db_product = await session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    if db_product.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this product")
        
    await session.delete(db_product)
    await session.commit()
    return {"ok": True}
