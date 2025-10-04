from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
import json
from bson import json_util
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import io
import tempfile
from decimal import Decimal

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# === DATA MODELS ===

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    sku: str
    category: str  # Ring, Necklace, Earring, Bracelet, etc.
    weight: float  # in grams
    purity: str  # 18K, 22K, 24K, etc.
    rate_per_gram: float
    stock_quantity: int
    description: Optional[str] = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProductCreate(BaseModel):
    name: str
    sku: str
    category: str
    weight: float
    purity: str
    rate_per_gram: float
    stock_quantity: int
    description: Optional[str] = ""

class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: Optional[str] = ""
    address: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    address: str

class InvoiceItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    quantity: int
    weight: float
    rate_per_gram: float
    amount: float

class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    customer_id: str
    customer_name: str
    customer_phone: str
    customer_address: str
    items: List[InvoiceItem]
    subtotal: float
    tax_percentage: float
    tax_amount: float
    total_amount: float
    invoice_date: date
    created_at: datetime = Field(default_factory=datetime.utcnow)

class InvoiceCreate(BaseModel):
    customer_id: str
    items: List[dict]  # {product_id, quantity}
    tax_percentage: float = 3.0  # Default GST for jewelry

class SalesRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str
    product_id: str
    product_name: str
    sku: str
    quantity: int
    weight: float
    rate_per_gram: float
    amount: float
    sale_date: date
    created_at: datetime = Field(default_factory=datetime.utcnow)

# === PRODUCT APIS ===

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    product_dict = product.dict()
    product_obj = Product(**product_dict)
    await db.products.insert_one(product_obj.dict())
    return product_obj

@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await db.products.find().to_list(1000)
    return [Product(**product) for product in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductCreate):
    existing_product = await db.products.find_one({"id": product_id})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated_data = product.dict()
    await db.products.update_one({"id": product_id}, {"$set": updated_data})
    
    updated_product = await db.products.find_one({"id": product_id})
    return Product(**updated_product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# === CUSTOMER APIS ===

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate):
    customer_dict = customer.dict()
    customer_obj = Customer(**customer_dict)
    await db.customers.insert_one(customer_obj.dict())
    return customer_obj

@api_router.get("/customers", response_model=List[Customer])
async def get_customers():
    customers = await db.customers.find().to_list(1000)
    return [Customer(**customer) for customer in customers]

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return Customer(**customer)

# === INVOICE APIS ===

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate):
    # Get customer details
    customer = await db.customers.find_one({"id": invoice_data.customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Process items and calculate totals
    invoice_items = []
    subtotal = 0.0
    
    for item_data in invoice_data.items:
        product = await db.products.find_one({"id": item_data["product_id"]})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item_data['product_id']} not found")
        
        quantity = item_data["quantity"]
        weight = product["weight"] * quantity
        amount = weight * product["rate_per_gram"]
        
        invoice_item = InvoiceItem(
            product_id=product["id"],
            product_name=product["name"],
            sku=product["sku"],
            quantity=quantity,
            weight=weight,
            rate_per_gram=product["rate_per_gram"],
            amount=amount
        )
        invoice_items.append(invoice_item)
        subtotal += amount
        
        # Update stock
        new_stock = product["stock_quantity"] - quantity
        await db.products.update_one({"id": product["id"]}, {"$set": {"stock_quantity": new_stock}})
    
    # Calculate taxes and total
    tax_amount = subtotal * (invoice_data.tax_percentage / 100)
    total_amount = subtotal + tax_amount
    
    # Generate invoice number
    invoice_count = await db.invoices.count_documents({})
    invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{invoice_count + 1:04d}"
    
    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        customer_id=customer["id"],
        customer_name=customer["name"],
        customer_phone=customer["phone"],
        customer_address=customer["address"],
        items=invoice_items,
        subtotal=subtotal,
        tax_percentage=invoice_data.tax_percentage,
        tax_amount=tax_amount,
        total_amount=total_amount,
        invoice_date=date.today()
    )
    
    await db.invoices.insert_one(invoice.dict())
    
    # Create sales records
    for item in invoice_items:
        sales_record = SalesRecord(
            invoice_id=invoice.id,
            product_id=item.product_id,
            product_name=item.product_name,
            sku=item.sku,
            quantity=item.quantity,
            weight=item.weight,
            rate_per_gram=item.rate_per_gram,
            amount=item.amount,
            sale_date=date.today()
        )
        await db.sales_records.insert_one(sales_record.dict())
    
    return invoice

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices():
    invoices = await db.invoices.find().sort("created_at", -1).to_list(1000)
    return [Invoice(**invoice) for invoice in invoices]

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return Invoice(**invoice)

# === EXCEL GENERATION ===

def create_invoice_excel(invoice: Invoice) -> str:
    """Create Excel file for invoice and return file path"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Invoice"
    
    # Styling
    header_font = Font(bold=True, size=14)
    title_font = Font(bold=True, size=16)
    border = Border(left=Side(style='thin'), right=Side(style='thin'), 
                   top=Side(style='thin'), bottom=Side(style='thin'))
    
    # Title
    ws.merge_cells('A1:F1')
    ws['A1'] = "JEWELRY STORE INVOICE"
    ws['A1'].font = title_font
    ws['A1'].alignment = Alignment(horizontal='center')
    
    # Invoice details
    ws['A3'] = "Invoice Number:"
    ws['B3'] = invoice.invoice_number
    ws['A4'] = "Date:"
    ws['B4'] = invoice.invoice_date.strftime('%d-%m-%Y')
    
    # Customer details
    ws['D3'] = "Customer Name:"
    ws['E3'] = invoice.customer_name
    ws['D4'] = "Phone:"
    ws['E4'] = invoice.customer_phone
    ws['D5'] = "Address:"
    ws['E5'] = invoice.customer_address
    
    # Items table header
    headers = ["S.No", "Product Name", "SKU", "Qty", "Weight(g)", "Rate/g", "Amount"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=7, column=col, value=header)
        cell.font = header_font
        cell.border = border
    
    # Items data
    for row, item in enumerate(invoice.items, 8):
        ws.cell(row=row, column=1, value=row-7).border = border
        ws.cell(row=row, column=2, value=item.product_name).border = border
        ws.cell(row=row, column=3, value=item.sku).border = border
        ws.cell(row=row, column=4, value=item.quantity).border = border
        ws.cell(row=row, column=5, value=f"{item.weight:.2f}").border = border
        ws.cell(row=row, column=6, value=f"₹{item.rate_per_gram:.2f}").border = border
        ws.cell(row=row, column=7, value=f"₹{item.amount:.2f}").border = border
    
    # Totals
    last_row = len(invoice.items) + 8
    ws[f'F{last_row}'] = "Subtotal:"
    ws[f'G{last_row}'] = f"₹{invoice.subtotal:.2f}"
    ws[f'F{last_row+1}'] = f"Tax ({invoice.tax_percentage}%):"
    ws[f'G{last_row+1}'] = f"₹{invoice.tax_amount:.2f}"
    ws[f'F{last_row+2}'] = "Total:"
    ws[f'G{last_row+2}'] = f"₹{invoice.total_amount:.2f}"
    ws[f'F{last_row+2}'].font = header_font
    ws[f'G{last_row+2}'].font = header_font
    
    # Save file
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, f"Invoice_{invoice.invoice_number}.xlsx")
    wb.save(file_path)
    return file_path

def create_sales_excel(start_date: str, end_date: str, sales_records: List[dict]) -> str:
    """Create Excel file for sales report and return file path"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Sales Report"
    
    # Styling
    header_font = Font(bold=True, size=12)
    title_font = Font(bold=True, size=16)
    border = Border(left=Side(style='thin'), right=Side(style='thin'), 
                   top=Side(style='thin'), bottom=Side(style='thin'))
    
    # Title
    ws.merge_cells('A1:H1')
    ws['A1'] = f"SALES REPORT ({start_date} to {end_date})"
    ws['A1'].font = title_font
    ws['A1'].alignment = Alignment(horizontal='center')
    
    # Headers
    headers = ["Date", "Invoice No", "Product Name", "SKU", "Qty", "Weight(g)", "Rate/g", "Amount"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=3, column=col, value=header)
        cell.font = header_font
        cell.border = border
    
    # Data
    total_amount = 0
    for row, record in enumerate(sales_records, 4):
        ws.cell(row=row, column=1, value=record["sale_date"]).border = border
        ws.cell(row=row, column=2, value=record["invoice_number"]).border = border
        ws.cell(row=row, column=3, value=record["product_name"]).border = border
        ws.cell(row=row, column=4, value=record["sku"]).border = border
        ws.cell(row=row, column=5, value=record["quantity"]).border = border
        ws.cell(row=row, column=6, value=f"{record['weight']:.2f}").border = border
        ws.cell(row=row, column=7, value=f"₹{record['rate_per_gram']:.2f}").border = border
        ws.cell(row=row, column=8, value=f"₹{record['amount']:.2f}").border = border
        total_amount += record["amount"]
    
    # Total
    last_row = len(sales_records) + 4
    ws[f'G{last_row}'] = "TOTAL:"
    ws[f'H{last_row}'] = f"₹{total_amount:.2f}"
    ws[f'G{last_row}'].font = header_font
    ws[f'H{last_row}'].font = header_font
    
    # Save file
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, f"Sales_Report_{start_date}_to_{end_date}.xlsx")
    wb.save(file_path)
    return file_path

@api_router.get("/invoices/{invoice_id}/download")
async def download_invoice(invoice_id: str):
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice_obj = Invoice(**invoice)
    file_path = create_invoice_excel(invoice_obj)
    
    return FileResponse(
        path=file_path,
        filename=f"Invoice_{invoice_obj.invoice_number}.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@api_router.get("/sales/download")
async def download_sales_report(start_date: str, end_date: str):
    # Parse dates
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get sales records
    sales_pipeline = [
        {
            "$match": {
                "sale_date": {"$gte": start, "$lte": end}
            }
        },
        {
            "$lookup": {
                "from": "invoices",
                "localField": "invoice_id",
                "foreignField": "id",
                "as": "invoice_info"
            }
        },
        {
            "$unwind": "$invoice_info"
        }
    ]
    
    sales_cursor = db.sales_records.aggregate(sales_pipeline)
    sales_records = await sales_cursor.to_list(None)
    
    # Format data for Excel
    formatted_records = []
    for record in sales_records:
        formatted_records.append({
            "sale_date": record["sale_date"].strftime('%d-%m-%Y'),
            "invoice_number": record["invoice_info"]["invoice_number"],
            "product_name": record["product_name"],
            "sku": record["sku"],
            "quantity": record["quantity"],
            "weight": record["weight"],
            "rate_per_gram": record["rate_per_gram"],
            "amount": record["amount"]
        })
    
    file_path = create_sales_excel(start_date, end_date, formatted_records)
    
    return FileResponse(
        path=file_path,
        filename=f"Sales_Report_{start_date}_to_{end_date}.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

# === DASHBOARD APIS ===

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_products = await db.products.count_documents({})
    total_customers = await db.customers.count_documents({})
    total_invoices = await db.invoices.count_documents({})
    
    # Today's sales
    today = date.today()
    today_sales = await db.sales_records.aggregate([
        {"$match": {"sale_date": today}},
        {"$group": {"_id": None, "total_amount": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    today_sales_amount = today_sales[0]["total_amount"] if today_sales else 0
    
    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_invoices": total_invoices,
        "today_sales": today_sales_amount
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()