# Order Flow Documentation

## Overview
This document describes the complete order lifecycle from cart to delivery, including how Cart, Order, OrderLineItem, TransactionHistory, and DeliveryTracking work together.

## Flow Diagram

```
1. Cart (Shopping Phase)
   ↓
2. Checkout (Order Creation)
   ↓
3. Order + OrderLineItems (Order Created)
   ↓
4. Payment Processing
   ↓
5. TransactionHistory (Payment Recorded)
   ↓
6. Order Status: "paid" → "fulfilled"
   ↓
7. DeliveryTracking (For Physical Items Only)
   ↓
8. Order Status: "delivered"
```

## Detailed Flow

### Phase 1: Cart (Shopping)
- **Status**: User browsing and adding items
- **Tables Used**: `Cart`
- **Actions**:
  - User adds items to cart via `createCart` mutation
  - Cart items stored with: `book_title`, `book_type`, `price`, `quantity`
  - Cart persists until checkout or deletion

### Phase 2: Checkout (Order Creation)
- **Trigger**: User clicks "Checkout" or "Place Order"
- **Process**:
  1. Validate cart items (check stock, prices)
  2. Find or create Customer record for user
  3. Create Order with status "draft"
  4. For each cart item:
     - Find Book by `book_title`
     - Find BookVariant by matching `book_type` to variant `format`
     - Create OrderLineItem linked to BookVariant
  5. Calculate totals (subtotal, tax, shipping, discount)
  6. Generate unique `order_number`
  7. Update Order with calculated totals
  8. Clear cart items (soft delete or hard delete)

### Phase 3: Payment Processing
- **Status**: Order status = "pending", payment_status = "pending"
- **Process**:
  1. User selects payment method
  2. Payment gateway processes payment
  3. Create TransactionHistory entry:
     - Type: "authorization" (initial)
     - Status: "pending"
     - Amount: order total
  4. On payment success:
     - Update TransactionHistory: status = "succeeded"
     - Create new TransactionHistory: type = "capture"
     - Update Order: 
       - `payment_status` = "captured"
       - `status` = "paid"

### Phase 4: Order Fulfillment
- **Status**: Order status = "paid"
- **Process**:
  - For **Digital Items** (ebook):
    - Mark OrderLineItem: `fulfillment_status` = "delivered"
    - Grant access to digital asset
    - Update Order: `status` = "fulfilled"
  
  - For **Physical Items** (hardcover, paperback):
    - Mark OrderLineItem: `fulfillment_status` = "in_progress"
    - Create DeliveryTracking entry:
      - `order_id`: Order ID
      - `order_lineitem_id`: OrderLineItem ID (optional, for item-level tracking)
      - `carrier`: Shipping carrier name
      - `tracking_number`: Unique tracking number
      - `status`: "pending"
    - When shipped:
      - Update DeliveryTracking: `status` = "in_transit", `shipped_at` = now
    - When delivered:
      - Update DeliveryTracking: `status` = "delivered", `delivered_at` = now
      - Update OrderLineItem: `fulfillment_status` = "delivered"
      - If all items delivered: Update Order: `status` = "fulfilled"

### Phase 5: Refunds (If Needed)
- **Process**:
  1. Create TransactionHistory entry:
     - Type: "refund"
     - Amount: refund amount
     - Status: "pending" → "succeeded"
  2. Update Order:
     - `payment_status` = "refunded"
     - `status` = "refunded"

## Key Relationships

### Order → OrderLineItem
- One Order has many OrderLineItems
- Each OrderLineItem represents one product variant in the order
- OrderLineItem links to BookVariant (not just Book)

### Order → TransactionHistory
- One Order can have multiple TransactionHistory entries
- Types: authorization, capture, refund, chargeback
- Tracks all payment-related activities

### Order → DeliveryTracking
- One Order can have multiple DeliveryTracking entries
- Each physical item can have its own tracking (via order_lineitem_id)
- Or one tracking for entire order (order_lineitem_id = null)

### OrderLineItem → DeliveryTracking
- Optional relationship
- Allows item-level tracking (useful when items ship separately)

## Status Fields

### Order.status
- `draft`: Order created but not yet paid
- `pending`: Payment pending
- `paid`: Payment received, awaiting fulfillment
- `fulfilled`: All items delivered/fulfilled
- `cancelled`: Order cancelled
- `refunded`: Order refunded

### Order.payment_status
- `pending`: Payment not yet processed
- `authorized`: Payment authorized but not captured
- `captured`: Payment captured successfully
- `refunded`: Payment refunded
- `failed`: Payment failed

### OrderLineItem.fulfillment_status
- `unfulfilled`: Not yet processed
- `in_progress`: Being prepared/shipped
- `shipped`: Shipped (for physical items)
- `delivered`: Delivered to customer
- `cancelled`: Item cancelled

### DeliveryTracking.status
- `pending`: Tracking created, awaiting shipment
- `in_transit`: Package in transit
- `out_for_delivery`: Out for delivery
- `delivered`: Delivered to customer
- `delayed`: Delivery delayed
- `failed`: Delivery failed

## Implementation Notes

### Cart to Order Conversion
Since Cart doesn't store `book_id` or `book_variant_id`, we need to:
1. Match cart items to books by `book_title`
2. Match cart `book_type` to BookVariant `format`:
   - "Paper-back" → "paperback"
   - "E-copy" → "ebook"
   - "Hard-cover" → "hardcover"
3. Handle cases where book/variant not found (error or skip)

### Order Number Generation
- Format: `ORD-{YYYYMMDD}-{RANDOM}` or `ORD-{TIMESTAMP}-{RANDOM}`
- Must be unique (enforced by schema)

### Stock Management
- When creating OrderLineItem, check `BookVariant.stock_quantity`
- Decrement stock when order is confirmed (status = "paid")
- Increment stock on cancellation/refund

### Digital vs Physical Items
- Check `BookVariant.format`:
  - Digital: "ebook", "audiobook" → No DeliveryTracking needed
  - Physical: "hardcover", "paperback" → DeliveryTracking required

## API Endpoints Needed

### Order Management
- `createOrderFromCart` - Convert cart to order
- `getOrderById` - Get order details
- `getOrdersByCustomer` - List customer orders
- `updateOrderStatus` - Update order status (admin)
- `cancelOrder` - Cancel order

### Payment
- `createTransaction` - Record payment transaction
- `updateTransactionStatus` - Update transaction status
- `processRefund` - Process refund

### Delivery
- `createDeliveryTracking` - Create tracking entry
- `updateDeliveryTracking` - Update tracking status
- `getDeliveryTracking` - Get tracking info
- `getTrackingByOrder` - Get all tracking for order

