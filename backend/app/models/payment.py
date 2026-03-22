from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime


class Payment(SQLModel, table=True):
    __tablename__ = "payments"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")

    # Razorpay fields
    razorpay_order_id: str = Field(index=True)
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None

    # Transaction details
    amount: float  # in INR (rupees, not paise — we convert to paise in the router)
    currency: str = "INR"
    status: str = "created"  # created, paid, failed

    # What this payment is for
    payment_for: str  # customer_order, shop_order, manufacturer_purchase, manufacturer_sale, farmer_expense
    reference_id: Optional[int] = None  # foreign order/expense ID

    # Shipping / extra details (JSON-like free text)
    shipping_address: Optional[str] = None
    shipping_status: Optional[str] = None  # pending, shipped, in_transit, delivered
    tracking_id: Optional[str] = None
    notes: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None


# --- Pydantic Models ---

class PaymentCreateRequest(SQLModel):
    amount: float
    payment_for: str  # customer_order, shop_order, manufacturer_purchase, manufacturer_sale, farmer_expense
    reference_id: Optional[int] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None


class PaymentVerifyRequest(SQLModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentRead(SQLModel):
    id: int
    user_id: int
    razorpay_order_id: str
    razorpay_payment_id: Optional[str]
    amount: float
    currency: str
    status: str
    payment_for: str
    reference_id: Optional[int]
    shipping_address: Optional[str]
    shipping_status: Optional[str]
    tracking_id: Optional[str]
    notes: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime]
