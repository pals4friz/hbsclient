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
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas

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
    labor_charges: float = 0.0
    tax_included: bool = True  # Whether tax is included or excluded
    tax_percentage: float = 3.0
    tax_amount: float = 0.0
    total_amount: float
    invoice_date: str  # Store as string to avoid BSON issues
    created_at: datetime = Field(default_factory=datetime.utcnow)

class InvoiceCreate(BaseModel):
    customer_id: str
    items: List[dict]  # {product_id, quantity}
    labor_charges: float = 0.0
    tax_included: bool = True
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
    sale_date: str  # Store as string to avoid BSON issues
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GoldRate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    purity: str  # 18K, 20K, 22K, 24K, Silver
    rate_per_gram: float
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class GoldRateCreate(BaseModel):
    purity: str
    rate_per_gram: float

class GoldRateUpdate(BaseModel):
    rate_per_gram: float

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
    
    # Add labor charges
    subtotal_with_labor = subtotal + invoice_data.labor_charges
    
    # Calculate taxes and total
    if invoice_data.tax_included:
        tax_amount = subtotal_with_labor * (invoice_data.tax_percentage / 100)
        total_amount = subtotal_with_labor + tax_amount
    else:
        tax_amount = 0.0
        total_amount = subtotal_with_labor
    
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
        labor_charges=invoice_data.labor_charges,
        tax_included=invoice_data.tax_included,
        tax_percentage=invoice_data.tax_percentage,
        tax_amount=tax_amount,
        total_amount=total_amount,
        invoice_date=date.today().isoformat()
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
            sale_date=date.today().isoformat()
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

# === PDF GENERATION ===

def create_invoice_pdf(invoice: Invoice) -> str:
    """Create PDF file for invoice and return file path"""
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, f"Invoice_{invoice.invoice_number}.pdf")
    
    # Create PDF document
    doc = SimpleDocTemplate(file_path, pagesize=A4)
    elements = []
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], 
                                fontSize=24, spaceAfter=30, alignment=1)
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], 
                                  fontSize=14, spaceAfter=12)
    normal_style = styles['Normal']
    
    # Title
    title = Paragraph("💎 JEWELRY STORE INVOICE", title_style)
    elements.append(title)
    elements.append(Spacer(1, 20))
    
    # Invoice details and customer info in a table
    invoice_data = [
        ['Invoice Number:', invoice.invoice_number, '', 'Customer Name:', invoice.customer_name],
        ['Date:', invoice.invoice_date, '', 'Phone:', invoice.customer_phone],
        ['', '', '', 'Address:', invoice.customer_address[:50] + ('...' if len(invoice.customer_address) > 50 else '')],
    ]
    
    invoice_table = Table(invoice_data, colWidths=[1.2*inch, 1.5*inch, 0.3*inch, 1.2*inch, 2.8*inch])
    invoice_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    elements.append(invoice_table)
    elements.append(Spacer(1, 30))
    
    # Items table
    items_data = [['S.No', 'Product Name', 'SKU', 'Qty', 'Weight(g)', 'Rate/g', 'Amount']]
    
    for i, item in enumerate(invoice.items, 1):
        items_data.append([
            str(i),
            item.product_name[:20] + ('...' if len(item.product_name) > 20 else ''),
            item.sku,
            str(item.quantity),
            f"{item.weight:.2f}g",
            f"₹{item.rate_per_gram:.2f}",
            f"₹{item.amount:.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[0.5*inch, 2.2*inch, 1*inch, 0.6*inch, 0.8*inch, 1*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    elements.append(items_table)
    elements.append(Spacer(1, 30))
    
    # Totals table
    totals_data = [
        ['Items Subtotal:', f"₹{invoice.subtotal:.2f}"],
    ]
    
    if invoice.labor_charges > 0:
        totals_data.append(['Labor Charges:', f"₹{invoice.labor_charges:.2f}"])
    
    if invoice.tax_included and invoice.tax_amount > 0:
        totals_data.append([f'Tax ({invoice.tax_percentage}%):', f"₹{invoice.tax_amount:.2f}"])
    
    totals_data.append(['Total Amount:', f"₹{invoice.total_amount:.2f}"])
    
    totals_table = Table(totals_data, colWidths=[4*inch, 1.5*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, -1), (-1, -1), 2, colors.black),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    elements.append(totals_table)
    elements.append(Spacer(1, 30))
    
    # Add tax note if without tax
    if not invoice.tax_included:
        tax_note = Paragraph("*This invoice is without tax", 
                           ParagraphStyle('TaxNote', parent=styles['Normal'], 
                                        fontSize=10, textColor=colors.red, 
                                        alignment=1, fontName='Helvetica-Oblique'))
        elements.append(tax_note)
        elements.append(Spacer(1, 20))
    
    # Thank you message
    thank_you = Paragraph("Thank you for your business!", 
                         ParagraphStyle('ThankYou', parent=styles['Normal'], 
                                      fontSize=12, alignment=1, 
                                      fontName='Helvetica-Bold'))
    elements.append(thank_you)
    
    # Build PDF
    doc.build(elements)
    return file_path

# === EXCEL GENERATION (KEPT FOR SALES REPORTS) ===

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
    ws['B4'] = invoice.invoice_date
    
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
    current_row = last_row
    
    ws[f'F{current_row}'] = "Subtotal:"
    ws[f'G{current_row}'] = f"₹{invoice.subtotal:.2f}"
    current_row += 1
    
    # Labor charges if any
    if invoice.labor_charges > 0:
        ws[f'F{current_row}'] = "Labor Charges:"
        ws[f'G{current_row}'] = f"₹{invoice.labor_charges:.2f}"
        current_row += 1
    
    # Tax if included
    if invoice.tax_included and invoice.tax_amount > 0:
        ws[f'F{current_row}'] = f"Tax ({invoice.tax_percentage}%):"
        ws[f'G{current_row}'] = f"₹{invoice.tax_amount:.2f}"
        current_row += 1
    
    ws[f'F{current_row}'] = "Total Amount:"
    ws[f'G{current_row}'] = f"₹{invoice.total_amount:.2f}"
    ws[f'F{current_row}'].font = header_font
    ws[f'G{current_row}'].font = header_font
    
    # Add note about tax
    if not invoice.tax_included:
        current_row += 2
        ws[f'A{current_row}'] = "Note: This invoice is without tax"
        ws[f'A{current_row}'].font = Font(italic=True)
    
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
    file_path = create_invoice_pdf(invoice_obj)
    
    return FileResponse(
        path=file_path,
        filename=f"Invoice_{invoice_obj.invoice_number}.pdf",
        media_type="application/pdf"
    )

@api_router.get("/invoices/{invoice_id}/print")
async def get_invoice_for_print(invoice_id: str):
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return Invoice(**invoice)

@api_router.get("/sales/download")
async def download_sales_report(start_date: str, end_date: str):
    # Parse and validate dates
    try:
        start_parsed = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_parsed = datetime.strptime(end_date, '%Y-%m-%d').date()
        # Convert to string for MongoDB query
        start = start_parsed.isoformat()
        end = end_parsed.isoformat()
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
            "sale_date": record["sale_date"],
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

# === GOLD RATES APIS ===

@api_router.get("/gold-rates", response_model=List[GoldRate])
async def get_gold_rates():
    rates = await db.gold_rates.find().to_list(1000)
    return [GoldRate(**rate) for rate in rates]

@api_router.post("/gold-rates", response_model=GoldRate)
async def create_gold_rate(rate: GoldRateCreate):
    # Check if rate for this purity already exists
    existing_rate = await db.gold_rates.find_one({"purity": rate.purity})
    if existing_rate:
        raise HTTPException(status_code=400, detail=f"Rate for {rate.purity} already exists. Use update instead.")
    
    rate_dict = rate.dict()
    rate_obj = GoldRate(**rate_dict)
    await db.gold_rates.insert_one(rate_obj.dict())
    return rate_obj

@api_router.put("/gold-rates/{purity}", response_model=GoldRate)
async def update_gold_rate(purity: str, rate_update: GoldRateUpdate):
    existing_rate = await db.gold_rates.find_one({"purity": purity})
    if not existing_rate:
        raise HTTPException(status_code=404, detail=f"Rate for {purity} not found")
    
    updated_data = {
        "rate_per_gram": rate_update.rate_per_gram,
        "updated_at": datetime.utcnow()
    }
    
    await db.gold_rates.update_one({"purity": purity}, {"$set": updated_data})
    updated_rate = await db.gold_rates.find_one({"purity": purity})
    return GoldRate(**updated_rate)

@api_router.get("/gold-rates/{purity}", response_model=GoldRate)
async def get_gold_rate_by_purity(purity: str):
    rate = await db.gold_rates.find_one({"purity": purity})
    if not rate:
        raise HTTPException(status_code=404, detail=f"Rate for {purity} not found")
    return GoldRate(**rate)

# Initialize default gold rates if they don't exist
@api_router.post("/gold-rates/initialize")
async def initialize_default_rates():
    default_rates = [
        {"purity": "18K", "rate_per_gram": 4500.0},
        {"purity": "20K", "rate_per_gram": 5000.0},
        {"purity": "22K", "rate_per_gram": 5500.0},
        {"purity": "24K", "rate_per_gram": 6000.0},
        {"purity": "Silver", "rate_per_gram": 80.0}
    ]
    
    initialized_count = 0
    for rate_data in default_rates:
        existing = await db.gold_rates.find_one({"purity": rate_data["purity"]})
        if not existing:
            rate_obj = GoldRate(**rate_data)
            await db.gold_rates.insert_one(rate_obj.dict())
            initialized_count += 1
    
    return {"message": f"Initialized {initialized_count} default gold rates"}

# === DASHBOARD APIS ===

@api_router.post("/dashboard/reset-sales")
async def reset_sales_data():
    """Reset all sales data (invoices and sales records) while keeping products and customers"""
    try:
        # Delete all invoices
        invoices_result = await db.invoices.delete_many({})
        
        # Delete all sales records
        sales_result = await db.sales_records.delete_many({})
        
        # Reset stock quantities back to original values if needed
        # (Optional: You might want to keep current stock levels)
        
        return {
            "message": "Sales data reset successfully",
            "deleted_invoices": invoices_result.deleted_count,
            "deleted_sales_records": sales_result.deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting sales data: {str(e)}")

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_products = await db.products.count_documents({})
    total_customers = await db.customers.count_documents({})
    total_invoices = await db.invoices.count_documents({})
    
    # Today's sales
    today = date.today().isoformat()
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