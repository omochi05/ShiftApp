from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import Sale
from schemas import SaleCreate, SaleResponse

router = APIRouter(
    prefix="/sales",
    tags=["sales"]
)


@router.get("/", response_model=List[SaleResponse])
def get_sales(db: Session = Depends(get_db)):
    sales = db.query(Sale).order_by(Sale.sale_date).all()
    return sales


@router.post("/", response_model=SaleResponse)
def create_sale(sale: SaleCreate, db: Session = Depends(get_db)):
    new_sale = Sale(
        sale_date=sale.sale_date,
        amount=sale.amount,
        customer_count=sale.customer_count,
        memo=sale.memo,
    )

    db.add(new_sale)

    try:
        db.commit()
        db.refresh(new_sale)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="この日付の売上はすでに登録されています"
        )

    return new_sale