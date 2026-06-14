from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth_deps import require_owner
from database import get_db
from models import Sale, User


router = APIRouter(
    prefix="/sales",
    tags=["sales"],
)


class SaleCreate(BaseModel):
    sale_date: date
    amount: float
    customer_count: Optional[int] = 0
    memo: Optional[str] = ""


class SaleUpdate(BaseModel):
    sale_date: date
    amount: float
    customer_count: Optional[int] = 0
    memo: Optional[str] = ""


class SaleResponse(BaseModel):
    id: int
    sale_date: date
    amount: float
    customer_count: Optional[int] = 0
    memo: Optional[str] = ""

    class Config:
        from_attributes = True


@router.get("/", response_model=List[SaleResponse])
def get_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    return db.query(Sale).order_by(Sale.sale_date.desc()).all()


@router.post("/", response_model=SaleResponse)
def create_sale(
    sale_data: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    existing_sale = (
        db.query(Sale)
        .filter(Sale.sale_date == sale_data.sale_date)
        .first()
    )

    if existing_sale:
        raise HTTPException(
            status_code=409,
            detail="この日付の売上はすでに登録されています",
        )

    try:
        sale = Sale(
            sale_date=sale_data.sale_date,
            amount=sale_data.amount,
            customer_count=sale_data.customer_count or 0,
            memo=sale_data.memo or "",
        )

        db.add(sale)
        db.commit()
        db.refresh(sale)

        return sale

    except Exception as error:
        db.rollback()
        print("売上登録に失敗しました:", error)

        raise HTTPException(
            status_code=500,
            detail="売上登録に失敗しました",
        )


@router.put("/{sale_id}", response_model=SaleResponse)
def update_sale(
    sale_id: int,
    sale_data: SaleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()

    if sale is None:
        raise HTTPException(
            status_code=404,
            detail="売上データが見つかりません",
        )

    duplicate_sale = (
        db.query(Sale)
        .filter(Sale.sale_date == sale_data.sale_date)
        .filter(Sale.id != sale_id)
        .first()
    )

    if duplicate_sale:
        raise HTTPException(
            status_code=409,
            detail="この日付の売上はすでに登録されています",
        )

    try:
        sale.sale_date = sale_data.sale_date
        sale.amount = sale_data.amount
        sale.customer_count = sale_data.customer_count or 0
        sale.memo = sale_data.memo or ""

        db.commit()
        db.refresh(sale)

        return sale

    except Exception as error:
        db.rollback()
        print("売上更新に失敗しました:", error)

        raise HTTPException(
            status_code=500,
            detail="売上更新に失敗しました",
        )


@router.delete("/{sale_id}")
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()

    if sale is None:
        raise HTTPException(
            status_code=404,
            detail="売上データが見つかりません",
        )

    try:
        db.delete(sale)
        db.commit()

        return {
            "message": "売上データを削除しました",
            "sale_id": sale_id,
        }

    except Exception as error:
        db.rollback()
        print("売上削除に失敗しました:", error)

        raise HTTPException(
            status_code=500,
            detail="売上削除に失敗しました",
        )