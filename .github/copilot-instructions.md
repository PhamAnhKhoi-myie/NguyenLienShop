# AI Copilot Instructions - NguyenLienShop Backend

**NguyenLienShop** is a Node.js/Express e-commerce backend with MongoDB. The codebase follows a **modular service architecture** with clear separation of concerns.

## Quick Start

```bash
# Setup
npm install
# Create .env with: MONGODB_URI, MONGODB_DB_NAME, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, PORT (default 5000)

# Run
npm run dev        # Hot-reload via nodemon
npm test           # Jest tests
npm run seed       # Populate test data
```

**Stack**: Express.js v5.1 • MongoDB + Mongoose • Zod validation • JWT + bcrypt auth

## Project Structure

```
src/
├── app.js                 # Express setup (helmet, cors, rate-limit, error handler)
├── server.js              # Entry point + graceful shutdown (SIGINT/SIGTERM)
├── config/db.js           # MongoDB connection with retry logic (5 attempts, exponential backoff)
├── routes/index.js        # Route aggregation point (mounts all module routes)
├── modules/               # Feature modules (auth, users, products, categories, carts, orders, payments)
│   ├── products/routes/   # Nested routes for 3-level hierarchy
│   ├── carts/
│   ├── orders/
│   ├── payments/
│   ├── discounts/
│   └── ... (other modules)
├── middlewares/           # Shared middleware (auth, validate, authorize, errorHandler)
├── utils/                 # Utilities (AppError, asyncHandler, validators, auth, crypto, helpers)
└── docs/swagger.js        # Swagger/OpenAPI documentation
```

## Core Architecture: Three-Tier Request Flow

```
Request
  ↓
Route (specific routes BEFORE dynamic routes)
  ↓
Validate (Zod schema via middleware)
  ↓
Authenticate (JWT extraction + verification)
  ↓
Controller (asyncHandler-wrapped)
  ↓
Service (static class with business logic)
  ↓
Model (Mongoose with atomic operations)
  ↓
Mapper (DTO transformation)
  ↓
JSON Response
```

### Every Module Has This Structure

```
modules/feature/
├── feature.model.js          # Mongoose schema, hooks, soft-delete
├── feature.service.js        # Static class: business logic, validation, DTOs
├── feature.controller.js      # asyncHandler-wrapped handlers
├── feature.mapper.js         # Transform docs → response DTOs
├── feature.validator.js      # Zod schemas
└── feature.routes.js         # Router with middleware chaining
```

**For 3-level hierarchies** (products → variants → units):
```
modules/products/
├── product.{model,service,controller,mapper,validator}.js
├── variant.{model,service,controller,mapper,validator}.js
├── variant_unit.{model,service,controller,mapper,validator}.js
└── routes/
    ├── index.js          # Aggregates sub-routes
    ├── product.routes.js
    ├── variant.routes.js
    └── variant_unit.routes.js
```

## Critical Patterns & Rules

### 1. The `asyncHandler` Pattern (MANDATORY)

**Every controller function MUST be wrapped:**

```javascript
// ✅ CORRECT
const getProduct = asyncHandler(async (req, res) => {
    const product = await ProductService.getProductById(req.params.id);
    res.json({ success: true, data: product });
});

// ❌ WRONG - crashes server on error
const getProduct = async (req, res) => {
    // unhandled promise rejection = server crash
};
```

**Implementation** (from `src/utils/asyncHandler.util.js`):
```javascript
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);  // Catches errors → errorHandler
};
```

### 2. Static Service Class Pattern

Services are **always static classes** - never instantiate:

```javascript
class ProductService {
    static async getProductById(id) {
        // No constructor, no this.property
        const product = await Product.findById(id);
        return ProductMapper.toDTO(product);  // Always return DTO
    }
    
    static async createProduct(data) {
        // Validation FIRST
        if (!data.name) throw new AppError('Name required', 400, 'VALIDATION_ERROR');
        
        // Then delegate to model
        const product = new Product(data);
        return ProductMapper.toDTO(await product.save());
    }
}
```

**Why static?** Stateless, testable, clear that no instances exist.

### 3. Error Handling with AppError

All errors use `AppError` from `src/utils/appError.util.js`:

```javascript
// ✅ CORRECT
throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');

// ❌ WRONG
throw new Error('not found');  // No status, no error code
```

The `errorHandler` middleware catches all AppError and responds with:
```json
{ "success": false, "code": "ERROR_CODE", "message": "..." }
```

### 4. Route Ordering: Specific BEFORE Dynamic

**This is a gotcha** - exact routes must come first:

```javascript
// ✅ CORRECT order
router.get('/search', productController.search);           // Specific
router.get('/category/:categoryId', productController.getByCategory);  // More specific
router.get('/:productId', productController.getOne);       // Dynamic: LAST

// ❌ WRONG - /search caught by /:productId
router.get('/:productId', productController.getOne);
router.get('/search', productController.search);  // Never reached!
```

### 5. Validation via Zod Schemas

Define schemas in `module.validator.js`, apply via middleware:

```javascript
// validator.js
const createProductSchema = z.object({
    name: z.string().min(1),
    category_id: z.string(),
});

// routes.js
const validate = require('../../middlewares/validate.middleware');

router.post('/', validate(createProductSchema), ProductController.create);
```

The `validate()` middleware throws AppError on failure → errorHandler catches it.

### 6. DTO Mapping: Hide Internals

**Never expose raw MongoDB docs** - always use mappers:

```javascript
// product.mapper.js
class ProductMapper {
    static toDTO(doc) {
        return {
            id: doc._id.toString(),        // Expose as 'id'
            name: doc.name,
            price: doc.min_price,
            // ❌ Exclude: _id, __v, internal_field, tokenHash
        };
    }
}

// controller.js
const product = await ProductService.getProductById(id);
// Service already returns ProductMapper.toDTO(...)
res.json({ success: true, data: product });  // DTO, not raw doc
```

---

## DTO Mapping Rules (MANDATORY)

### 6.1 Overview

Mapper chịu trách nhiệm:

```text
- Transform MongoDB document → API response DTO
- Hide internal fields (_id, __v, internal flags)
- Normalize structure (id string, nested objects)
```

👉 Mapper là **boundary cuối cùng trước response**

### 6.2 Null Handling (MANDATORY)

#### Problem

```javascript
const product = await Product.findById(id);
// product = null

return ProductMapper.toDTO(product); // ❌ crash
```

#### ✅ Rule

```javascript
static toDTO(doc) {
    if (!doc) return null;

    return {
        id: doc._id.toString(),
        name: doc.name
    };
}
```

#### Invariant

```text
- Mapper MUST handle null input
- MUST NOT throw error for null
```

### 6.3 List Mapping (MANDATORY)

#### Problem

```javascript
const products = await Product.find();
return products; // ❌ raw docs
```

#### ✅ Rule

```javascript
const products = await Product.find();

return products.map(ProductMapper.toDTO);
```

#### Safe version (defensive)

```javascript
static toDTOList(docs) {
    if (!docs || docs.length === 0) return [];

    return docs.map(doc => this.toDTO(doc));
}
```

#### Invariant

```text
- List MUST always return array (never null)
- MUST NOT contain raw MongoDB docs
```

### 6.4 Nested Mapping (CRITICAL)

#### Problem

```javascript
// ❌ WRONG
return {
    id: order._id,
    items: order.items // raw nested data
};
```

#### ✅ Rule: Map recursively

```javascript
class OrderMapper {
    static toDTO(order) {
        if (!order) return null;

        return {
            id: order._id.toString(),

            items: order.items.map(item => ({
                product_id: item.product_id,
                variant_id: item.variant_id,

                product_name: item.product_name,
                variant_label: item.variant_label,

                price: item.price_at_order,
                quantity: item.quantity,
                line_total: item.line_total
            })),

            pricing: {
                subtotal: order.pricing.subtotal,
                total: order.pricing.total_amount
            },

            status: order.status
        };
    }
}
```

#### Invariant

```text
- Nested arrays MUST be mapped
- Nested objects MUST NOT leak internal fields
```

### 6.5 ID Normalization

#### Problem

```json
{
  "_id": "ObjectId(...)"
}
```

#### ✅ Rule

```javascript
id: doc._id.toString()
```

#### Invariant

```text
- NEVER expose _id
- ALWAYS return id as string
```

### 6.6 Field Whitelisting (IMPORTANT)

#### ❌ WRONG

```javascript
return { ...doc.toObject() };
```

👉 Will expose:

```
- _id
- __v
- is_deleted
- internal flags
```

#### ✅ CORRECT

```javascript
return {
    id: doc._id.toString(),
    name: doc.name,
    price: doc.min_price
};
```

#### Invariant

```text
- Mapper MUST explicitly whitelist fields
- NEVER spread raw document
```

### 6.7 Optional Fields Handling

#### Problem

```javascript
return {
    image: doc.image // undefined
};
```

#### ✅ Rule

```javascript
image: doc.image || null
```

#### Invariant

```text
- Undefined MUST NOT appear in response
- Use null instead
```

### 6.8 Date Formatting (Recommended)

#### Raw

```javascript
created_at: doc.created_at
```

#### Better

```javascript
created_at: doc.created_at?.toISOString()
```

### 6.9 Boolean Normalization

```javascript
is_active: Boolean(doc.is_active)
```

### 6.10 Mapper Composition (Advanced)

#### Khi có nested entity

```javascript
class ProductMapper {
    static toDTO(doc) {
        if (!doc) return null;

        return {
            id: doc._id.toString(),
            name: doc.name,
            variants: VariantMapper.toDTOList(doc.variants)
        };
    }
}
```

### 6.11 Performance Considerations

```text
- Avoid heavy computation inside mapper
- Mapper should be pure transform
- No DB calls inside mapper
```

### 6.12 Critical Invariants (MANDATORY)

```text
- ✅ Mapper MUST handle null safely
- ✅ Mapper MUST NOT return raw MongoDB docs
- ✅ Mapper MUST normalize id (_id → id)
- ✅ Mapper MUST map nested structures
- ✅ Mapper MUST whitelist fields (no spread)
- ✅ Mapper MUST return consistent shape
```

### 6.13 Common Mistakes This Prevents

```text
❌ Crash khi doc = null
❌ API trả về raw MongoDB (_id, __v)
❌ Nested object leak
❌ undefined field trong response
❌ inconsistent response shape
❌ AI dùng spread operator bừa
```

### 6.14 Future Enhancements (Optional)

```text
- Generic BaseMapper class
- Pagination mapper wrapper
- Field projection ở query để giảm payload
```

### 6.15 Summary: After This Section

✅ Response của bạn sẽ **clean + stable + predictable**
✅ AI sẽ không còn "lỡ tay" expose internal data
✅ Frontend dễ consume hơn
✅ No undefined fields, no raw MongoDB docs, no crashes on null

### 7. Atomic MongoDB Operations

Never read → modify → save. Use MongoDB operators:

```javascript
// ❌ WRONG: Race condition risk
let cart = await Cart.findById(cartId);
cart.items.push(newItem);
await cart.save();  // Another request might have modified between find & save

// ✅ CORRECT: Atomic
const result = await Cart.findByIdAndUpdate(
    cartId,
    { $push: { items: newItem } },  // Atomic push
    { new: true }
);

if (!result) throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
```

**Key operators**: `$push`, `$pull`, `$inc`, `$set` - all atomic.

### 8. Stock Management with Conditions

**Critical**: Stock updates MUST have `$gte` conditions to prevent overselling:

```javascript
// ❌ WRONG: No condition
await Variant.updateOne(
    { _id: variantId },
    { $inc: { 'stock.available': -qty } }
);
// Someone else might have sold the same stock!

// ✅ CORRECT: Conditional update
const result = await Variant.updateOne(
    {
        _id: variantId,
        'stock.available': { $gte: qty }  // ← Condition is MANDATORY
    },
    {
        $inc: {
            'stock.available': -qty,
            'stock.reserved': +qty
        }
    }
);

// ALWAYS check result
if (result.modifiedCount === 0) {
    throw new AppError('Insufficient stock', 409, 'INSUFFICIENT_STOCK');
}
```

**Never use `findByIdAndUpdate`** for stock - it returns the doc, not the count. Use `updateOne` + check `modifiedCount`.

---

## Error Code Convention (MANDATORY)

### 1. Overview

Tất cả lỗi trong hệ thống **PHẢI sử dụng AppError với error code chuẩn hóa**.

```javascript
throw new AppError(message, statusCode, errorCode);
```

### 2. Naming Convention

#### Format (MANDATORY)

```text
DOMAIN_ACTION
```

#### Ví dụ

```text
AUTH_INVALID_TOKEN
AUTH_UNAUTHORIZED

USER_NOT_FOUND

PRODUCT_NOT_FOUND
PRODUCT_OUT_OF_STOCK

CART_EMPTY
CART_ITEM_NOT_FOUND

ORDER_NOT_FOUND
ORDER_INVALID_STATE

PAYMENT_FAILED
PAYMENT_NOT_FOUND

DISCOUNT_INVALID
DISCOUNT_EXPIRED
```

### 3. Domain List (STANDARDIZED)

```text
AUTH
USER
PRODUCT
VARIANT
CART
ORDER
PAYMENT
DISCOUNT
SYSTEM
VALIDATION
```

### 4. HTTP Status Mapping

```text
400 → VALIDATION / BAD REQUEST
401 → AUTH (unauthenticated)
403 → AUTH (forbidden)
404 → *_NOT_FOUND
409 → CONFLICT (stock, state)
500 → SYSTEM errors
```

#### Ví dụ

```javascript
throw new AppError(
    'Product not found',
    404,
    'PRODUCT_NOT_FOUND'
);
```

```javascript
throw new AppError(
    'Insufficient stock',
    409,
    'INSUFFICIENT_STOCK'
);
```

### 5. Error Response Format (STRICT)

```json
{
  "success": false,
  "code": "PRODUCT_NOT_FOUND",
  "message": "Product not found"
}
```

### 6. Standard Error Set (RECOMMENDED BASELINE)

#### AUTH

```text
AUTH_INVALID_TOKEN
AUTH_TOKEN_EXPIRED
AUTH_UNAUTHORIZED
AUTH_FORBIDDEN
```

#### USER

```text
USER_NOT_FOUND
USER_ALREADY_EXISTS
```

#### PRODUCT / VARIANT

```text
PRODUCT_NOT_FOUND
VARIANT_NOT_FOUND
UNIT_NOT_FOUND
INSUFFICIENT_STOCK
```

#### CART

```text
CART_NOT_FOUND
CART_EMPTY
CART_ITEM_NOT_FOUND
```

#### ORDER

```text
ORDER_NOT_FOUND
ORDER_INVALID_STATE
INVALID_ORDER_TRANSITION
```

#### PAYMENT

```text
PAYMENT_NOT_FOUND
PAYMENT_FAILED
PAYMENT_ALREADY_PROCESSED
INVALID_PAYMENT_SIGNATURE
```

#### DISCOUNT

```text
DISCOUNT_INVALID
DISCOUNT_EXPIRED
DISCOUNT_NOT_APPLICABLE
```

#### VALIDATION

```text
VALIDATION_ERROR
INVALID_INPUT
```

#### SYSTEM

```text
INTERNAL_SERVER_ERROR
DATABASE_ERROR
```

### 7. Rules (MANDATORY)

```text
- MUST use predefined error codes
- MUST follow DOMAIN_ACTION format
- MUST NOT invent random strings
- MUST NOT use generic Error
```

#### ❌ WRONG

```javascript
throw new Error('Something went wrong');
```

```javascript
throw new AppError('Error', 400, 'BAD');
```

#### ✅ CORRECT

```javascript
throw new AppError(
    'Cart is empty',
    400,
    'CART_EMPTY'
);
```

### 8. Centralized Definition (RECOMMENDED)

**File**: `src/utils/errorCodes.util.js`

```javascript
const ERROR_CODES = {
    // Auth
    AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
    AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
    AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
    AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

    // User
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',

    // Product
    PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
    VARIANT_NOT_FOUND: 'VARIANT_NOT_FOUND',
    UNIT_NOT_FOUND: 'UNIT_NOT_FOUND',

    // Stock
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',

    // Cart
    CART_NOT_FOUND: 'CART_NOT_FOUND',
    CART_EMPTY: 'CART_EMPTY',
    CART_ITEM_NOT_FOUND: 'CART_ITEM_NOT_FOUND',

    // Order
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    ORDER_INVALID_STATE: 'ORDER_INVALID_STATE',
    INVALID_ORDER_TRANSITION: 'INVALID_ORDER_TRANSITION',

    // Payment
    PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
    INVALID_PAYMENT_SIGNATURE: 'INVALID_PAYMENT_SIGNATURE',

    // Discount
    DISCOUNT_INVALID: 'DISCOUNT_INVALID',
    DISCOUNT_EXPIRED: 'DISCOUNT_EXPIRED',
    DISCOUNT_NOT_APPLICABLE: 'DISCOUNT_NOT_APPLICABLE',

    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',

    // System
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR'
};

module.exports = ERROR_CODES;
```

👉 tránh typo

### 9. Mapping Business Logic → Error Code

#### Ví dụ: Checkout

```javascript
if (!cart.items.length) {
    throw new AppError('Cart is empty', 400, ERROR_CODES.CART_EMPTY);
}

if (stockFail) {
    throw new AppError(
        'Insufficient stock',
        409,
        ERROR_CODES.INSUFFICIENT_STOCK
    );
}
```

#### Ví dụ: Payment IPN

```javascript
if (!isValidSignature) {
    throw new AppError(
        'Invalid signature',
        400,
        ERROR_CODES.INVALID_PAYMENT_SIGNATURE
    );
}

if (payment.is_verified) {
    // Already processed
    return res.json({
        RspCode: '00',
        Message: 'Already processed'
    });
}
```

#### Ví dụ: Order State Transition

```javascript
if (!ORDER_TRANSITIONS[order.status].includes(nextState)) {
    throw new AppError(
        `Invalid transition: ${order.status} → ${nextState}`,
        409,
        ERROR_CODES.INVALID_ORDER_TRANSITION
    );
}
```

### 10. Logging Integration (IMPORTANT)

Error code phải dùng cho logging:

```javascript
logger.error({
    code: err.code,
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    timestamp: new Date().toISOString()
});
```

**Benefit**: 
- Có thể filter logs by error code
- Có thể track error frequency
- Monitoring/alerting trở nên có giá trị

### 11. Critical Invariants

```text
- ✅ Every error MUST have a stable error code
- ✅ Same error MUST always return same code
- ✅ Error code MUST NOT depend on message text
- ✅ Error code MUST be machine-readable
- ✅ Error code MUST be centrally defined
```

### 12. Common Mistakes This Prevents

```text
❌ Random error string khắp codebase
❌ Frontend không parse được lỗi
❌ Log không filter được
❌ AI generate inconsistent error
❌ Debug production cực khó
❌ Multiple errors cho cùng trường hợp
```

### Summary: After This Section

✅ Error handling của bạn sẽ **deterministic + scalable**
✅ Frontend có thể xử lý logic theo `code` thay vì message
✅ Logging / monitoring trở nên có giá trị
✅ AI sẽ generate consistent error codes
✅ Production debugging trở nên dễ dàng hơn

---

## Logging & Observability (MANDATORY)

### 1. Overview

Hệ thống phải log các event quan trọng để:

```text
- Debug lỗi production
- Trace request flow (checkout → payment → order)
- Audit payment & stock
- Monitor hệ thống
```

### 2. Logging Principles

```text
- MUST log structured JSON (không log string tự do)
- MUST include event name
- MUST include identifiers (order_id, user_id…)
- MUST NOT log sensitive data (token, password)
```

### 3. Log Structure (STANDARD)

```json
{
  "event": "payment_ipn",
  "level": "info",
  "timestamp": "2026-01-01T10:00:00Z",

  "request_id": "req_123",

  "user_id": "...",
  "order_id": "...",
  "payment_id": "...",

  "status": "paid",
  "message": "Payment confirmed"
}
```

#### Required Fields

```text
event        → tên event (bắt buộc)
level        → info | warn | error
timestamp    → ISO string
request_id   → trace request

+ context fields (order_id, payment_id…)
```

### 4. Events MUST Log (CRITICAL)

#### 4.1 Payment IPN

```javascript
logger.info({
    event: 'payment_ipn_received',
    payment_id,
    order_id,
    provider: 'vnpay',
    raw_code: vnp_ResponseCode
});
```

**After processing**:

```javascript
logger.info({
    event: 'payment_processed',
    payment_id,
    order_id,
    status: 'paid'
});
```

#### 4.2 Order Created

```javascript
logger.info({
    event: 'order_created',
    order_id,
    user_id,
    total_amount: order.pricing.total_amount
});
```

#### 4.3 Stock Update

**Success**:

```javascript
logger.info({
    event: 'stock_reserved',
    variant_id,
    quantity,
    remaining: newStock
});
```

**Failure (IMPORTANT)**:

```javascript
logger.warn({
    event: 'stock_insufficient',
    variant_id,
    requested: qty,
    available: stock.available
});
```

#### 4.4 Checkout Flow

```javascript
logger.info({
    event: 'checkout_started',
    user_id,
    cart_id
});

logger.info({
    event: 'checkout_completed',
    user_id,
    order_id,
    total_amount: totalPrice
});
```

#### 4.5 Errors

```javascript
logger.error({
    event: 'error',
    code: err.code,
    message: err.message,
    stack: err.stack,
    request_id: req.request_id
});
```

### 5. Log Levels

```text
info  → normal flow (order created, payment success)
warn  → business issue (stock fail, retry)
error → system failure (exception, DB error)
```

### 6. Request Tracing (IMPORTANT)

Mỗi request phải có `request_id`:

```javascript
// Middleware
app.use((req, res, next) => {
    req.request_id = req.headers['x-request-id'] || uuid();
    next();
});

// Usage in all logs
logger.info({
    request_id: req.request_id,
    event: 'checkout_completed'
});
```

→ Propagate qua:

```javascript
logger.info({
    request_id: req.request_id,
    order_id: order._id,
    event: 'order_created'
});
```

#### Invariant

```text
- All logs MUST include request_id
- Must be consistent across flow
```

### 7. What NOT to Log

```text
- password
- JWT token
- raw payment signature
- sensitive personal data
```

✅ **CORRECT** (safe data only):

```javascript
logger.info({
    event: 'auth_login',
    user_id: user._id,  // ✅ safe
    timestamp: new Date().toISOString()
    // ❌ never: password, token
});
```

### 8. Correlation Between Systems

**Flow**: Checkout → Order → Payment → IPN

Phải trace được bằng:

```text
- order_id
- payment_id
- request_id
```

**Example**:

```javascript
// Checkout
logger.info({
    event: 'checkout_started',
    request_id: req.request_id,
    user_id
});

// Order created
logger.info({
    event: 'order_created',
    request_id: req.request_id,
    order_id,
    user_id
});

// Payment created
logger.info({
    event: 'payment_created',
    request_id: req.request_id,
    payment_id,
    order_id,
    user_id
});

// IPN processed (different request, but same order_id)
logger.info({
    event: 'payment_verified',
    order_id,  // ← same order_id
    payment_id,
    status: 'paid'
});
```

### 9. Minimal Logger Setup (Node.js)

```javascript
const logger = {
    info: (data) => console.log(JSON.stringify({ 
        level: 'info', 
        timestamp: new Date().toISOString(),
        ...data 
    })),
    
    warn: (data) => console.warn(JSON.stringify({ 
        level: 'warn', 
        timestamp: new Date().toISOString(),
        ...data 
    })),
    
    error: (data) => console.error(JSON.stringify({ 
        level: 'error', 
        timestamp: new Date().toISOString(),
        ...data 
    }))
};
```

### 10. Critical Invariants

```text
- ✅ All critical flows MUST be logged
- ✅ Logs MUST be structured JSON
- ✅ Logs MUST include identifiers (order_id, payment_id)
- ✅ Logs MUST be consistent across modules
- ✅ Errors MUST include error code
- ✅ All logs MUST include request_id
```

### 11. Common Mistakes This Prevents

```text
❌ Không biết payment fail ở đâu
❌ Không trace được order lifecycle
❌ Không debug được stock issue
❌ Log không parse được (string rác)
❌ Không correlate được request
❌ IPN callback không có context
```

### Summary: After This Section

✅ Bạn có thể debug production một cách thực tế
✅ Payment + Order flow trở nên **traceable**
✅ Log có thể dùng cho monitoring (ELK, Datadog…)
✅ Production incidents trở nên investigatable
✅ System observability complete

---

## Complete Production Backend Specification

**Bạn đã đạt Production-ready backend spec cho AI + dev**

### Sections Included

1. ✅ **Discount System** - Scope-based, future-proof
2. ✅ **Concurrency & Idempotency** - Double-submit, race condition, IPN retry
3. ✅ **Transaction Boundary** - Clear rules when/when not to use
4. ✅ **Checkout Flow** - 8 ordered steps, atomic operations
5. ✅ **Payment Flow** - IPN vs Return URL, signature verification
6. ✅ **Order Lifecycle** - 5-state machine, strict transitions
7. ✅ **DTO Mapping Rules** - Production-safe mappers
8. ✅ **Error Code Convention** - Standardized, deterministic errors
9. ✅ **Logging & Observability** - Structured logging, request tracing, event correlation

### What This Enables

```text
- AI agents can implement payment system correctly first-time
- Transaction lifecycle (cart → order → payment → fulfillment) fully specified
- All edge cases documented (null handling, race conditions, IPN retry, stock oversell)
- Logging enables production debugging
- Error codes enable intelligent frontend error handling
- Mapper rules prevent data leaks
- Concurrency patterns prevent double-orders
```

### Ready For

- ✅ Production deployment
- ✅ Team onboarding (new developers follow this spec)
- ✅ AI-powered development (Copilot generates code matching spec)
- ✅ Code review (reviewers verify against these rules)
- ✅ Monitoring & alerting (error codes feed into monitoring)

---

## Security Rules (MANDATORY)

### 1. Ownership Check (CRITICAL)

#### Rule

```text
User chỉ được access resource thuộc về mình
```

Áp dụng cho:

```text
- cart
- order
- payment
- address
```

#### 1.1 Implementation Pattern (MANDATORY)

##### ❌ WRONG

```javascript
const order = await Order.findById(orderId);
```

→ thiếu ownership check

##### ✅ CORRECT

```javascript
const order = await Order.findOne({
    _id: orderId,
    user_id: req.user.id
});

if (!order) {
    throw new AppError(
        'Order not found',
        404,
        'ORDER_NOT_FOUND'
    );
}
```

#### 1.2 Invariant

```text
- MUST filter by user_id in EVERY query
- MUST NOT fetch then check manually
- MUST return 404 (not 403) to avoid information leakage
```

#### 1.3 Anti-pattern (nguy hiểm)

```javascript
// ❌ WRONG
const order = await Order.findById(orderId);
if (order.user_id !== req.user.id) {
    throw new AppError('Forbidden', 403);
}
```

👉 đã leak existence của resource

### 2. Never Trust Client Data (CRITICAL)

#### Rule

```text
Client data = untrusted
Server MUST validate & recompute
```

#### 2.1 Price (IMPORTANT)

```text
- price từ client = IGNORE hoàn toàn
- luôn lấy từ DB (variant_units)
```

##### ❌ WRONG

```javascript
const total = req.body.price * qty;
```

##### ✅ CORRECT

```javascript
const unit = await VariantUnit.findById(unitId);
const total = unit.price * qty;
```

#### 2.2 Discount

```text
- client chỉ gửi code
- server validate & calculate
```

#### 2.3 Stock

```text
- client không được gửi stock
- server kiểm tra qua DB + $gte
```

#### 2.4 Order Total

```text
- client không được gửi total_amount
- server tính lại toàn bộ
```

#### 2.5 Invariant

```text
- NEVER trust price, total, discount from client
- ALWAYS recompute on server
- Pricing is computed by VariantUnit, not client
```

### 3. Sensitive Data Protection

```text
- NEVER return password
- NEVER return token hash
- NEVER log sensitive fields
- NEVER expose error stack to client
```

Use DTO mappers to whitelist fields.

### 4. Authorization Layers

```text
Auth (JWT)     → xác thực user (user is logged in)
Ownership      → xác thực resource thuộc user (this order is mine)
Role (optional) → admin / user (future)
```

### 5. Critical Invariants

```text
- ✅ Every resource access MUST enforce ownership (filter by user_id)
- ✅ Server MUST be source of truth for all financial data
- ✅ Client MUST NOT influence pricing/discount/total logic
- ✅ Ownership check MUST happen in query, not in code
- ✅ Sensitive data MUST be filtered via DTOs
```

### 6. Common Mistakes This Prevents

```text
❌ User xem được order người khác
❌ Hack giá / total bằng client data
❌ Fake discount code bypass
❌ Data leak via error response
❌ Fetch-then-check (race condition risk)
```

---

## API Design Consistency (MANDATORY)

### 1. HTTP Status Mapping

```text
200 OK        → success (GET, update)
201 Created   → resource created
400 Bad Req   → validation error
401 Unauthorized → chưa login / token invalid
403 Forbidden → không đủ quyền (nếu muốn explicit)
404 Not Found → resource không tồn tại / không thuộc user
409 Conflict  → conflict (stock, duplicate, state, order transition)
500 Internal  → system error
```

### 2. Standard Response Format

#### Success (200)

```json
{
  "success": true,
  "data": {...}
}
```

#### Created (201)

```json
{
  "success": true,
  "data": {...}
}
```

#### Error (4xx/5xx)

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "..."
}
```

### 3. Controller Pattern

#### ✅ CORRECT (GET/Update)

```javascript
res.status(200).json({
    success: true,
    data
});
```

#### ✅ CORRECT (Create)

```javascript
res.status(201).json({
    success: true,
    data: created
});
```

#### ✅ CORRECT (Error)

```javascript
throw new AppError(
    'Cart is empty',
    400,
    'CART_EMPTY'
);

// Converted by errorHandler to:
// {
//   "success": false,
//   "code": "CART_EMPTY",
//   "message": "Cart is empty"
// }
```

### 4. Pagination Format

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 5. Consistency Rules

```text
- ✅ MUST always include success field (true/false)
- ✅ MUST always use same error format
- ✅ MUST use correct HTTP status code
- ✅ MUST NOT mix response shapes
- ✅ MUST return DTOs (not raw MongoDB docs)
- ✅ MUST NOT expose error stack to client
```

### 6. Common Mistakes This Prevents

```text
❌ Return 200 for error
❌ Return different error format per endpoint
❌ Missing success field
❌ Expose raw error stack
❌ Inconsistent HTTP status
❌ Mix of different response structures
```

### 7. Example: Complete Flow

```javascript
// GET /api/v1/orders/orderId
const order = await Order.findOne({
    _id: orderId,
    user_id: req.user.id  // ← ownership check
});

if (!order) {
    throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
}

const dto = OrderMapper.toDTO(order);  // ← safe, mapped response

res.status(200).json({
    success: true,
    data: dto
});
```

---

## Summary: Security & API Design

### Security Enables:
✅ User data isolation (no cross-user access)
✅ Financial data integrity (server-computed pricing)
✅ Vulnerability prevention (no client-side attacks)
✅ Audit trail (ownership tracking)

### API Consistency Enables:
✅ Frontend can handle single error format
✅ AI can generate consistent responses
✅ Clients know exactly what to expect
✅ Debugging becomes straightforward

### Critical Rules (Non-negotiable):
- ✅ EVERY query filtering user resources MUST include `user_id`
- ✅ EVERY price/total/discount calculation MUST be server-computed
- ✅ EVERY response MUST use standard format (success, code/data, message)
- ✅ EVERY sensitive field MUST be filtered via DTO
- ✅ EVERY error MUST use standardized error code

Once an item is added to cart, its price is **immutable**:

```javascript
// On add to cart
const item = {
    product_id,
    variant_id,
    quantity,
    price_at_added: currentPrice,  // ← Snapshot at this moment
};
await Cart.updateOne(cartId, { $push: { items: item } });

// Later: if product price changes, cart price doesn't
// Always calculate line_total at response time:
lineTotal = item.price_at_added * item.quantity;  // Immutable
cartTotal = sum(lineTotals) - discount;  // Calculated, not stored
```

**Why?** Prevents "bait and switch" where prices change between add and checkout.

### 10. Soft Delete with Middleware

Models use logical delete, not physical:

```javascript
// In model
const schema = new mongoose.Schema({
    name: String,
    is_deleted: { type: Boolean, default: false },
    deleted_at: Date,
});

// Add middleware to auto-exclude deleted docs
schema.pre(/^find/, function() {
    this.where({ is_deleted: false });
});

// When deleting
Product.updateOne(
    { _id: productId },
    { is_deleted: true, deleted_at: new Date() }
);
// ✅ All finds automatically exclude it
```

For **partial indexes** (enable slug reuse after delete):
```javascript
schema.index({ slug: 1, is_deleted: 1 });  // Allows same slug if is_deleted=true
```

## Business Rules & Invariants

### Pricing System

**Source of Truth**: `variant_units` - product/variant prices are **cached**.

```javascript
// ✅ CORRECT: Change units, recalculate product
await VariantUnitService.updateUnit(unitId, { price: 100 });
// Service calls: ProductService.recalculatePricing(productId)

// ❌ WRONG: Direct write
product.min_price = 100;
await product.save();  // Violates caching invariant
```

### Stock Fields & Invariants

```
variant.stock = {
    available: 100,   // Ready to sell
    reserved: 20,     // Pending orders
    sold: 30,         // Completed orders
}

Invariant: available + reserved + sold = total_quantity
```

**Stock flow**:
1. **Checkout**: `available -= qty`, `reserved += qty` (atomic, with $gte)
2. **Payment**: No change
3. **Fulfill**: `reserved -= qty`, `sold += qty`
4. **Cancel**: `reserved -= qty`, `available += qty`

### Discount Rules

- Applied AFTER subtotal
- NOT applied to shipping/tax
- Single discount per cart (no stacking)
- Capped at subtotal

```javascript
const applied = discount.type === 'percentage'
    ? (subtotal * discount.value / 100)
    : discount.value;

finalDiscount = Math.min(applied, subtotal);  // Cap at subtotal
total = subtotal - finalDiscount + shipping;
```

### Order as Snapshot

Orders store **immutable snapshots**, not references:

```javascript
// ✅ CORRECT
order.items = [{
    product_name: 'Túi Bao Trái',      // Snapshot
    variant_label: '20x25 - Vải',      // Snapshot
    price_at_order: 5000,              // Snapshot
    quantity: 100,
}];

// ❌ WRONG
order.product_id = productId;
order.product = await Product.findById(productId);  // Stale after price change
```

## Discount System (PRODUCTION-SAFE SPEC)

**This system is strict but future-proof for expansion.**

### Overview

Single discount per cart (current system), with scope support for future multi-discount scenarios.

```
Current: 1 discount/cart, no stacking
Future-ready: Defined priority & combination rules
```

### 1. Scope (Application Range)

System supports multiple scope types:

```
- cart-level       → applies to entire cart subtotal
- product-level    → applies only to items with matching product_id
- variant-level    → applies only to items with matching variant_id
- category-level   → applies only to items in matching category
```

**Examples**:

**cart-level**: "Reduce 10% entire order" → Applied to total cart subtotal

**product-level**: "Product A: 20% off" → Only line items with product_id = A

**variant-level**: "Red variant: 10% off" → Only items matching this variant

**category-level**: "Category 'Fruits': 15% off" → All items in that category

### 2. Matching Logic (MANDATORY)

**Rule**: Discount applies to **ALL matching items**

```javascript
Cart: [
  { product: "A", qty: 2, price: 100 },  // line 1
  { product: "A", qty: 1, price: 100 },  // line 2
  { product: "B", qty: 1, price: 100 }   // line 3
]

Discount: product A -50%

Result: Lines 1 AND 2 both get 50% discount
        Line 3: no discount
```

**NOT supported (current system)**:
- ❌ Apply to first item only
- ❌ Buy 1 get 1 free
- ❌ Tier discount (more items = higher %)

If future requirements need these → **define as separate rule type**.

### 3. Discount Calculation

#### 3.1 Base Formula

```javascript
const applied =
    discount.type === 'percentage'
        ? (eligible_amount * discount.value) / 100
        : discount.value;
```

#### 3.2 Cap Rule (MANDATORY)

```javascript
// NEVER discount more than eligible amount
discount_amount = Math.min(applied, eligible_amount);
```

**Why?** Prevents negative prices or discounting beyond actual value.

#### 3.3 Eligible Amount

Determined by scope:

```
cart-level     → subtotal of entire cart
product-level  → sum of all items with that product_id
variant-level  → sum of all items with that variant_id
category-level → sum of all items in that category
```

### 4. Single Discount Rule (CURRENT SYSTEM)

```
- Only 1 discount per cart
- No stacking, no combining
```

```javascript
// ✅ CORRECT: Reject second discount
if (cart.discount && newDiscount) {
    throw new AppError(
        'Only one discount allowed per cart',
        400,
        'MULTIPLE_DISCOUNTS_NOT_ALLOWED'
    );
}
```

### 5. Conflict Resolution (Future-Proof)

Even though stacking isn't supported yet, define the rules for future expansion:

#### Priority Order (if stacking enabled)

```
1. Variant-level (most specific)
2. Product-level
3. Category-level
4. Cart-level (least specific)
```

#### Application Order (if combining)

```
Percentage discounts → BEFORE fixed amount
```

### 6. Distribution Logic (IMPORTANT)

When discount is NOT cart-level, must distribute to items:

```javascript
// For each matching item, calculate its portion
item_discount = (item.line_total / eligible_total) * total_discount;
```

**Example**:

```javascript
// Product A has 2 items
item1: 100k (50% of eligible)
item2: 50k  (25% of eligible)

discount: 30k total on product A

Distribution:
item1_discount = (100k / 150k) * 30k = 20k
item2_discount = (50k / 150k) * 30k = 10k
```

### 7. Exclusions (MANDATORY)

Discounts **NEVER apply to**:

```
- Shipping fees (if applicable)
- Taxes (if calculated)
- Previously applied discounts (no stacking)
```

```javascript
// ✅ CORRECT: Only discount subtotal
const total = subtotal - discountAmount + shipping_fee + tax;
```

### 8. Validation Rules (BEFORE APPLYING)

```javascript
// ✅ CORRECT: Validate before applying
const discount = await Discount.findOne({ code });

if (!discount) {
    throw new AppError('Discount code not found', 404, 'DISCOUNT_NOT_FOUND');
}

if (discount.end_at < new Date()) {
    throw new AppError('Discount expired', 410, 'DISCOUNT_EXPIRED');
}

if (discount.used_count >= discount.usage_limit) {
    throw new AppError('Discount limit reached', 410, 'DISCOUNT_LIMIT_REACHED');
}

if (cart.subtotal < discount.min_order_value) {
    throw new AppError(
        `Minimum order: ${discount.min_order_value}`,
        400,
        'DISCOUNT_MIN_ORDER_NOT_MET'
    );
}
```

### 9. Recommended Data Structure

```javascript
const discountSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },

    // Scope definition
    scope: {
        type: String,
        enum: ['cart', 'product', 'variant', 'category'],
        default: 'cart'
    },

    // Target for scope
    target_ids: [mongoose.Schema.Types.ObjectId],

    // Value
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true },

    // Limits & Constraints
    min_order_value: { type: Number, default: 0 },
    max_discount_amount: Number,

    // Usage tracking
    usage_limit: Number,
    used_count: { type: Number, default: 0 },

    // Temporal
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },

    // Audit
    created_at: { type: Date, default: Date.now },
    is_active: { type: Boolean, default: true }
});
```

### 10. Critical Invariants (MANDATORY)

```
- ✅ Discount applied AFTER subtotal calculation
- ✅ Only ONE discount per cart (current system)
- ✅ Discount NEVER exceeds eligible amount
- ✅ Discount calculation on backend only
- ✅ Matching items determined strictly by scope
- ✅ All matching items included (no partial match)
- ✅ No discount on shipping or tax
- ✅ Discount validation happens BEFORE checkout
```

### Common Mistakes This Prevents

- ❌ Applying discount to wrong scope
- ❌ Discounting beyond item price
- ❌ Only discounting first matching item
- ❌ Race condition with multiple discounts
- ❌ Client-side discount manipulation
- ❌ Incorrect distribution logic
- ❌ Discounting shipping/tax
- ❌ Applying discount twice

### Future Expansion Path

If you need to add later, keep these separate:

```
- Buy X get Y (quantity-based)
- Tier discounts (volume pricing)
- Stackable discounts (multi-discount support)
- Free shipping offers (special case)
- Time-limited flash sales (different tracking)
- Referral bonuses (user-based)
```

Each should be a **separate rule type**, not mixed into current logic.

## Concurrency & Idempotency (MANDATORY)

### 1. Overview

Hệ thống phải xử lý an toàn trong các trường hợp:

- User double click checkout
- Client retry request (timeout, network)
- Payment gateway retry IPN
- Multiple concurrent requests trên cùng resource

👉 **Tất cả các operation quan trọng phải idempotent + concurrency-safe**

### 2. Idempotency (MANDATORY)

#### 2.1 Definition

Một request gọi nhiều lần → kết quả phải giống nhau (không tạo duplicate)

#### 2.2 Áp dụng cho

- Checkout (create order + payment)
- Payment IPN
- Refund (future)

#### 2.3 Idempotency Key

**Nguồn key**:

```
Checkout:
  idempotency_key = user_id + cart_id

Payment:
  idempotency_key = vnp_txn_ref
```

#### 2.4 Implementation Pattern (MANDATORY)

```javascript
const existing = await OperationLog.findOne({ idempotency_key });

if (existing) {
    return existing.result;  // ← RETURN CACHED RESULT
}

// ... process request ...

await OperationLog.create({
    idempotency_key,
    result: responseData
});
```

#### 2.5 Rule

- ✅ MUST check idempotency BEFORE processing
- ✅ MUST store result AFTER success
- ✅ MUST return SAME response for same key

### 3. Checkout Idempotency (CRITICAL)

#### Problem

```
User click "Thanh toán" 2 lần
→ tạo 2 order
→ trừ stock 2 lần ❌
```

#### Solution: Simple Version

```javascript
const key = `${user_id}-${cart_id}`;

const existing = await Order.findOne({
    user_id,
    cart_id,
    status: { $in: ['pending', 'confirmed'] }
});

if (existing) {
    return existing;  // ← Return existing order
}

// Continue with checkout...
```

#### Solution: Stronger Version (RECOMMENDED)

Dùng OperationLog:

```javascript
const key = `checkout-${user_id}-${cart_id}`;

const existing = await OperationLog.findOne({ idempotency_key: key });

if (existing) {
    return existing.result;  // ← Return cached response
}

// ✅ Proceed with full checkout flow
const order = await Order.create({...});
const payment = await Payment.create({...});

// ✅ Store result for idempotency
await OperationLog.create({
    idempotency_key: key,
    result: { order, payment }
});

return { order, payment };
```

### 4. Payment IPN Idempotency (CRITICAL)

#### Problem

```
VNPay gọi IPN nhiều lần
→ update order nhiều lần
→ stock update sai ❌
```

#### Solution

```javascript
// ✅ CORRECT: Check is_verified flag FIRST
if (payment.is_verified) {
    return res.json({
        RspCode: '00',
        Message: 'Already processed'
    });
}

// ✅ ONLY update if not verified
await Payment.updateOne(
    { _id: payment._id },
    {
        status: 'paid',
        is_verified: true,
        verified_at: new Date()
    }
);

// ✅ Stock finalization only happens once
for (const item of order.items) {
    await Variant.updateOne({...});
}
```

#### Rule

- ✅ IPN MUST be idempotent
- ✅ MUST use `is_verified` flag
- ✅ MUST ignore duplicate callbacks
- ✅ If already processed → return success immediately

### 5. Concurrency Control (Stock)

#### Problem

```
2 user mua cùng lúc
→ oversell ❌
```

#### Solution (ALREADY USED - MUST KEEP)

```javascript
// ✅ CORRECT: Atomic update with condition
const result = await Variant.updateOne(
    {
        _id: variantId,
        'stock.available': { $gte: qty }  // ← Condition MANDATORY
    },
    {
        $inc: {
            'stock.available': -qty,
            'stock.reserved': +qty
        }
    }
);

if (result.modifiedCount === 0) {
    throw new AppError('Insufficient stock', 409, 'INSUFFICIENT_STOCK');
}
```

#### Rule

- ✅ MUST use atomic update (`updateOne` with `$inc`, NOT `findByIdAndUpdate`)
- ✅ MUST use `$gte` condition
- ✅ MUST check `modifiedCount === 1` (not just truthy)

### 6. Double-submit Protection

#### Problem

```
User spam API /checkout
→ multiple orders
```

#### Option A — Idempotency Key (RECOMMENDED)

```javascript
// Client sends idempotency key
headers: {
    'Idempotency-Key': 'unique-key'
}

// Server uses it
const existing = await OperationLog.findOne({
    idempotency_key: req.headers['idempotency-key']
});

if (existing) return existing.result;
```

#### Option B — DB Constraint

```javascript
// Unique index on checkout
const orderSchema = new mongoose.Schema({
    // ...
});

// Prevent duplicate pending checkouts
orderSchema.index(
    { user_id: 1, cart_id: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } }
);
```

#### Option C — In-Memory Lock (Optional, for high-load)

```javascript
const checkoutLocks = new Map();

if (checkoutLocks.has(user_id)) {
    throw new AppError('Checkout in progress', 409, 'CHECKOUT_IN_PROGRESS');
}

checkoutLocks.set(user_id, true);

try {
    // ... checkout process ...
} finally {
    checkoutLocks.delete(user_id);
}
```

### 7. Transaction Boundary (MANDATORY RULES)

#### 7.1 Overview

Transaction chỉ được dùng khi cần đảm bảo tính nhất quán giữa nhiều document.

**Use transaction ONLY when:**
- Multiple writes must succeed or fail together

#### 7.2 KHÔNG Dùng Transaction (IMPORTANT)

Các operation sau KHÔNG được dùng transaction:

```
- Cart updates (add/remove items)
- Single document updates
- Stock updates (đã atomic với $gte)
- Read operations
```

**Ví dụ ĐÚNG:**

```javascript
// ✅ CORRECT: No transaction needed (already atomic)
await Cart.updateOne(
    { _id: cartId },
    { $push: { items: newItem } }
);

await Variant.updateOne(
    {
        _id: variantId,
        'stock.available': { $gte: qty }
    },
    {
        $inc: {
            'stock.available': -qty,
            'stock.reserved': +qty
        }
    }
);
```

**❌ WRONG (overkill):**

```javascript
await session.withTransaction(async () => {
    await Cart.updateOne(...);
});
// ❌ Không cần thiết, giảm performance
```

#### 7.3 BẮT BUỘC Dùng Transaction

##### 7.3.1 Checkout Flow (CRITICAL)

Checkout gồm nhiều bước:

```
- Lock stock (modify variant)
- Create order (new doc)
- Create payment (new doc)
```

👉 Nếu **1 bước fail → phải rollback toàn bộ**

**✅ Implementation:**

```javascript
const session = await mongoose.startSession();

await session.withTransaction(async () => {
    // 1. Lock stock
    const stockResult = await Variant.updateOne(
        {
            _id: variantId,
            'stock.available': { $gte: qty }
        },
        {
            $inc: {
                'stock.available': -qty,
                'stock.reserved': +qty
            }
        },
        { session }  // ← Pass session
    );

    if (stockResult.modifiedCount === 0) {
        throw new AppError('Insufficient stock', 409, 'INSUFFICIENT_STOCK');
    }

    // 2. Create order
    const order = await Order.create([orderData], { session });

    // 3. Create payment
    const payment = await Payment.create([paymentData], { session });

    return { order, payment };
});
```

##### 7.3.2 Refund Flow (future)

```
- Update payment
- Update order
- Update stock

👉 MUST be atomic
```

#### 7.4 KHÔNG Dùng Transaction cho IPN

**IPN handler:**

```
- update payment
- update order
- update stock
```

👉 **Không bắt buộc transaction, vì:**

```
- đã có idempotency (is_verified flag)
- có thể retry safely
- IPN callback không có timeout pressure
```

**Khi nào nên dùng (optional):**

```javascript
// Nếu muốn strict consistency cao → có thể wrap transaction
// Nhưng không bắt buộc vì có is_verified flag
```

#### 7.5 Failure Scenarios (WHY TRANSACTION)

**❌ Không dùng transaction:**

```
Stock locked ✔
Order create ❌
→ stock bị giữ (bug) ← INCONSISTENT
```

**✅ Có transaction:**

```
Stock locked ❌ → rollback
Order ❌ → rollback
→ system consistent
```

#### 7.6 Transaction Rules (MANDATORY)

```
- ✅ MUST use transaction for checkout
- ✅ MUST pass session vào mọi query trong transaction
- ✅ MUST NOT mix session và non-session query
- ✅ MUST keep transaction short (no external API call)
```

**❌ Common mistake:**

```javascript
await session.withTransaction(async () => {
    await Variant.updateOne(..., { session });

    await callVNPayAPI(); // ❌ external call inside transaction

    await Order.create(..., { session });
});
```

**✅ CORRECT:**

```javascript
// ✅ transaction chỉ xử lý DB
await session.withTransaction(async () => {
    await Variant.updateOne(..., { session });
    await Order.create(..., { session });
    await Payment.create(..., { session });
});

// ✅ External calls OUTSIDE transaction
```

#### 7.7 Performance Considerations

Transaction overhead:

```
- chậm hơn normal query
- giữ lock lâu hơn
- ảnh hưởng throughput
```

👉 **Chỉ dùng khi thực sự cần** (multi-doc atomic operations)

#### 7.8 Critical Invariants

```
- ✅ Transaction MUST be used for multi-document atomic operations
- ✅ Transaction MUST NOT be used for single-document updates
- ✅ Checkout MUST be atomic (stock + order + payment)
- ✅ External API MUST NOT be inside transaction
- ✅ Session MUST be passed to all queries in transaction
- ✅ IPN can use idempotency instead of transaction (optional)
```

#### 7.9 Common Mistakes This Prevents

```
❌ Stock bị trừ nhưng order fail → inconsistent state
❌ Payment tạo nhưng order không tồn tại
❌ Transaction bị treo do gọi external API
❌ Lạm dụng transaction làm chậm hệ thống
❌ Mix query có session và không có session
```

#### 7.10 Summary

**Sau section này, hệ thống của bạn:**

✅ Có ranh giới rõ ràng khi nào cần transaction
✅ Tránh được:
  - over-engineering (transaction everywhere)
  - data inconsistency (missed transactions where needed)
  - performance degradation (transactions không cần thiết)

### 8. Failure Handling

#### Scenario: Partial Failure

```
Stock locked ✔
Order create ❌
→ Stock stuck in reserved state
```

#### Solution: Automatic Rollback

```javascript
try {
    // Lock stock
    await Variant.updateOne({...});

    // Create order
    const order = await Order.create({...});

    return order;
} catch (error) {
    // ✅ Release stock on any error
    await Variant.updateOne(
        { _id: variantId },
        {
            $inc: {
                'stock.reserved': -qty,
                'stock.available': +qty
            }
        }
    );

    throw error;
}
```

#### Better Solution: Use Transaction

```javascript
const session = await mongoose.startSession();
try {
    await session.withTransaction(async () => {
        // Both succeed or both rollback automatically
        await Variant.updateOne({...}, {...}, { session });
        await Order.create([...], { session });
    });
} catch (error) {
    // Session automatically rolls back everything
    throw error;
}
```

### 9. Critical Invariants (MANDATORY)

```
- ✅ Every critical operation MUST be idempotent
- ✅ Same idempotency_key MUST return same result
- ✅ Payment IPN MUST NOT run twice (use is_verified)
- ✅ Checkout MUST NOT create duplicate orders
- ✅ Stock update MUST be atomic (use $gte condition)
- ✅ Concurrent requests on same resource MUST be safe
- ✅ Partial failure MUST rollback all changes
```

### 10. Common Mistakes This Prevents

```
❌ Double order khi spam checkout
❌ Double payment processing
❌ Stock bị trừ nhiều lần
❌ Race condition khi concurrent request
❌ IPN xử lý lặp
❌ Partial failure không rollback
❌ Using findByIdAndUpdate for stock (returns doc, not count)
```

### Future Enhancements (Optional)

```
- Distributed lock (Redis)
- Message queue (BullMQ) for async processing
- Saga pattern for payment reconciliation
- Event sourcing for audit trail
```

---

### Summary: After This Section

✅ System safe dưới load
✅ Không bị lỗi "ngẫu nhiên" khó debug
✅ Payment + stock trở nên deterministic
✅ Concurrent requests được xử lý đúng
✅ Double-submit tự động bị chặn

## Checkout Flow (PRODUCTION-SAFE SPEC)

**Assumptions**: 1 cart → 1 order, no multi-vendor, single discount, backend shipping.

### Overview

Checkout converts **cart → order + payment**, locking stock atomically in sequence.

**All steps must execute in exact order. DO NOT reorder.**

```
1. Load Cart
2. Validate Cart
3. Re-fetch & Validate Product Data (source of truth)
4. Calculate Pricing (subtotal, discount, shipping)
5. Lock Stock (atomic, per item)
6. Create Order (snapshot)
7. Create Payment (pending)
8. Return Response
```

### Step 1: Load Cart

```javascript
const cart = await Cart.findOne({ user_id });

if (!cart) {
    throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
}
```

### Step 2: Validate Cart

```javascript
if (!cart.items || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400, 'CART_EMPTY');
}

// Validate each item: quantity > 0, unit_id exists, etc.
for (const item of cart.items) {
    if (!item.quantity || item.quantity <= 0) {
        throw new AppError('Invalid quantity', 400, 'INVALID_QUANTITY');
    }
}
```

### Step 3: Re-fetch & Validate Product Data (CRITICAL)

**DO NOT use `price_at_added` for checkout pricing.** Re-fetch from source of truth:

```javascript
for (const item of cart.items) {
    const unit = await VariantUnit.findById(item.unit_id);

    if (!unit) {
        throw new AppError('Unit not found', 404, 'UNIT_NOT_FOUND');
    }

    item.current_price = unit.price;  // ← Source of truth for checkout
}
```

**Why**: `price_at_added` is for UI display only. Checkout must use current price to prevent price manipulation.

### Step 4: Calculate Pricing

```javascript
// Subtotal (using current prices, not cart snapshots)
const subtotal = cart.items.reduce(
    (sum, item) => sum + item.current_price * item.quantity,
    0
);

// Apply Discount (single only, capped at subtotal)
let discountAmount = 0;
if (cart.discount) {
    const d = cart.discount;
    const applied =
        d.type === 'percentage'
            ? (subtotal * d.value) / 100
            : d.value;
    discountAmount = Math.min(applied, subtotal);
}

// Shipping (backend calculated, never trust client)
const shipping_fee = await ShippingService.calculate({
    user_id,
    items: cart.items
});

// Total
const total = subtotal - discountAmount + shipping_fee;
```

### Step 5: Lock Stock (MANDATORY - ATOMIC)

**Execute per item. Cannot batch with incorrect logic.**

```javascript
for (const item of cart.items) {
    const result = await Variant.updateOne(
        {
            _id: item.variant_id,
            'stock.available': { $gte: item.quantity }  // ← CONDITION IS MANDATORY
        },
        {
            $inc: {
                'stock.available': -item.quantity,
                'stock.reserved': +item.quantity
            }
        }
    );

    if (result.modifiedCount === 0) {
        throw new AppError(
            'Insufficient stock',
            409,
            'INSUFFICIENT_STOCK'
        );
    }
}
```

### Step 6: Create Order (SNAPSHOT - IMMUTABLE)

```javascript
const order = await Order.create({
    user_id,

    items: cart.items.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        unit_id: item.unit_id,

        product_name: item.product_name,      // ← Snapshot
        variant_label: item.variant_label,    // ← Snapshot
        sku: item.sku,                        // ← Snapshot

        price_at_order: item.current_price,   // ← Current price at checkout
        quantity: item.quantity,
        line_total: item.current_price * item.quantity
    })),

    pricing: {
        subtotal,
        discount_amount: discountAmount,
        shipping_fee,
        total_amount: total
    },

    status: 'pending'
});
```

### Step 7: Create Payment

```javascript
const payment = await Payment.create({
    order_id: order._id,
    user_id,
    amount: total,
    status: 'pending',
    method: 'vnpay'  // or other payment method
});
```

### Step 8: Return Response

```javascript
res.json({
    success: true,
    data: {
        order,
        payment
    }
});
```

### Critical Invariants (MANDATORY)

- ✅ Stock is deducted **ONLY at checkout** (never at cart add)
- ✅ `price_at_added` is **NEVER used** for final pricing (UI display only)
- ✅ Product price **must be re-fetched** from `variant_units` at checkout
- ✅ Stock **must be locked BEFORE** creating order
- ✅ If **ANY stock update fails** → entire checkout fails (reject order)
- ✅ Order is a **full snapshot** and must not depend on product after creation
- ✅ Shipping fee **must be calculated on backend** (never trust client)
- ✅ Only **ONE discount per cart** (no stacking)

### Known Risk: Partial Failure

**Problem**: If stock locks succeed but order creation fails, stock is held incorrectly:

```
Stock locked ✔
Order create ❌ (error)
→ Stock remains reserved (stuck)
```

**Solution Options**:

**Option A — Simple** (currently acceptable for MVP):
- If checkout fails after step 5 → manually rollback stock in error handler
- Document that failed checkouts require stock reconciliation

**Option B — Recommended** (production):
- Wrap entire flow in MongoDB transaction:

```javascript
const session = await mongoose.startSession();
await session.withTransaction(async () => {
    // Step 5: Lock stock
    await Variant.updateOne({...}, {...}, { session });
    
    // Step 6: Create order
    const order = await Order.create([...], { session });
    
    // Step 7: Create payment
    const payment = await Payment.create([...], { session });
    
    return { order, payment };
});
```

All-or-nothing atomicity: either complete checkout succeeds or all changes rollback automatically.

## Payment Flow (PRODUCTION-SAFE SPEC)

**This is the MOST CRITICAL section** - handles money, consistency, and payment provider retries.

### Overview

Payment flow consists of **2 separate streams**:

```
1. Client Redirect Flow (return URL) → NOT TRUSTED
2. Server Callback (IPN) → SOURCE OF TRUTH
```

**⚠️ ONLY IPN updates system state. Return URL is UI-only.**

### Complete Flow Diagram

```
Checkout
  → Create payment (pending)
  → Redirect user to VNPay

User returns (return URL)
  → Display UI only (NEVER update DB)

VNPay calls IPN (server → server)
  → Verify signature
  → Update payment + order
  → Finalize/release stock
```

### Step 1: Payment Creation (at Checkout)

```javascript
const payment = await Payment.create({
    order_id: order._id,
    user_id,
    amount: total,

    status: 'pending',
    method: 'vnpay',

    is_verified: false,  // ← Idempotency flag
    vnp_txn_ref: generateUniqueRef()  // ← For IPN matching
});
```

### Step 2: Return URL (NEVER TRUSTED)

User is redirected back to:

```text
/vnpay-return?vnp_ResponseCode=00&vnp_TxnRef=xxx...
```

#### ⚠️ Critical Rule:

```
- NEVER update payment here
- NEVER update order here
- Display UI ONLY
```

#### Example Handler (UI-only):

```javascript
const returnUrlHandler = asyncHandler(async (req, res) => {
    const { vnp_ResponseCode } = req.query;
    
    // ✅ Display based on response, but don't trust it
    if (vnp_ResponseCode === '00') {
        return res.redirect('/payment-success');  // UI only
    } else {
        return res.redirect('/payment-failed');   // UI only
    }
    
    // ❌ NEVER do this:
    // await Payment.updateOne(...);  // WRONG!
    // await Order.updateOne(...);    // WRONG!
});
```

**Why?** VNPay's return URL can be spoofed. Only IPN is authenticated via signature.

### Step 3: IPN Handler (SOURCE OF TRUTH)

Endpoint: `POST /api/v1/payments/vnpay-ipn`

#### Step 3a: Verify Signature (MANDATORY)

```javascript
const ipnHandler = asyncHandler(async (req, res) => {
    // ✅ CORRECT: Always verify signature first
    const isValid = VNPayService.verifySignature(req.query);

    if (!isValid) {
        return res.status(400).json({
            RspCode: '97',
            Message: 'Invalid signature'
        });
    }
    
    // Proceed only if signature is valid...
});
```

**Why?** Prevents spoofed webhook calls.

#### Step 3b: Find Payment

```javascript
const payment = await Payment.findOne({
    vnp_txn_ref: req.query.vnp_TxnRef
});

if (!payment) {
    return res.status(404).json({
        RspCode: '01',
        Message: 'Payment not found'
    });
}
```

#### Step 3c: Idempotency Check (CRITICAL)

```javascript
// ✅ CORRECT: Check if already processed
if (payment.is_verified) {
    // VNPay may call IPN multiple times
    return res.json({
        RspCode: '00',
        Message: 'Already processed'
    });
}
```

**Why?** VNPay may retry IPN if server doesn't respond immediately. Must be idempotent.

#### Step 3d: Process Payment Result

##### SUCCESS Case (`vnp_ResponseCode === '00'`)

```javascript
// ✅ CORRECT: Payment succeeded
await Payment.updateOne(
    { _id: payment._id },
    {
        status: 'paid',
        is_verified: true,
        verified_at: new Date(),
        vnp_response_code: req.query.vnp_ResponseCode
    }
);

await Order.updateOne(
    { _id: payment.order_id },
    { status: 'confirmed' }  // Ready for fulfillment
);
```

**Finalize Stock** (move from reserved → sold):

```javascript
// ✅ CORRECT: Confirm the sale
for (const item of order.items) {
    const result = await Variant.updateOne(
        {
            _id: item.variant_id,
            'stock.reserved': { $gte: item.quantity }
        },
        {
            $inc: {
                'stock.reserved': -item.quantity,
                'stock.sold': +item.quantity
            }
        }
    );

    if (result.modifiedCount === 0) {
        // Reserved stock missing - data corruption
        logger.error({
            event: 'stock_finalize_failed',
            order_id: order._id,
            variant_id: item.variant_id
        });
    }
}
```

##### FAILED Case (`vnp_ResponseCode !== '00'`)

```javascript
// ✅ CORRECT: Payment failed
await Payment.updateOne(
    { _id: payment._id },
    {
        status: 'failed',
        is_verified: true,
        verified_at: new Date(),
        vnp_response_code: req.query.vnp_ResponseCode
    }
);

await Order.updateOne(
    { _id: payment.order_id },
    { status: 'cancelled' }
);
```

**Release Stock** (restore from reserved → available):

```javascript
// ✅ CORRECT: Cancel the reservation
for (const item of order.items) {
    const result = await Variant.updateOne(
        {
            _id: item.variant_id,
            'stock.reserved': { $gte: item.quantity }
        },
        {
            $inc: {
                'stock.reserved': -item.quantity,
                'stock.available': +item.quantity  // ← Return to available
            }
        }
    );

    if (result.modifiedCount === 0) {
        logger.error({
            event: 'stock_release_failed',
            order_id: order._id,
            variant_id: item.variant_id
        });
    }
}
```

#### Step 3e: Respond to VNPay

```javascript
// ✅ CORRECT: Acknowledge receipt
return res.json({
    RspCode: '00',
    Message: 'Confirm Success'
});
```

**Why?** Tells VNPay to stop retrying IPN calls.

### Critical Invariants (MANDATORY)

- ✅ IPN is **ONLY source of truth** for payment status
- ✅ Return URL **NEVER updates database** (display UI only)
- ✅ Payment must be **idempotent** (use `is_verified` flag)
- ✅ Stock finalize **ONLY** after payment success
- ✅ Stock release **ONLY** after payment failure
- ✅ Payment signature **ALWAYS verified** before processing
- ✅ Each IPN call should be **idempotent** (same result if called multiple times)

### Race Conditions to Avoid

#### ❌ WRONG: Updating on Return URL

```javascript
// Return URL handler
if (vnp_ResponseCode === '00') {
    await Order.updateOne(...);  // ❌ WRONG!
    await Payment.updateOne(...);  // ❌ WRONG!
}
```

**Risk**: 
- Return URL can be called multiple times
- User can manually craft return URL
- Race condition between return URL and IPN

#### ✅ CORRECT: Ignore Return URL for DB Updates

```javascript
// Return URL handler
if (vnp_ResponseCode === '00') {
    return res.redirect('/payment-success');  // UI only
}
// ✅ No DB updates here
```

```javascript
// IPN handler (only source of truth)
if (payment.is_verified) {
    return res.json({ RspCode: '00' });  // Already processed
}

await Payment.updateOne(...);  // ✅ Update here
await Order.updateOne(...);    // ✅ Update here
```

### Common Mistakes This Prevents

- ❌ Updating order on return URL → double processing
- ❌ Processing IPN twice → duplicate stock finalization
- ❌ Missing signature verification → accepts spoofed webhooks
- ❌ Not releasing stock on payment failure → inventory corruption
- ❌ Finalizing stock with wrong timing → overselling
- ❌ No idempotency check → race condition on VNPay retry

### Advanced: Payment Expiry & Reconciliation

**Optional but recommended**:

```javascript
// Scheduled job (e.g., every 10 minutes)
const reconcilePayments = async () => {
    // Find pending payments older than 24 hours
    const expired = await Payment.find({
        status: 'pending',
        created_at: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    for (const payment of expired) {
        // Cancel order and release stock
        await Order.updateOne(
            { _id: payment.order_id },
            { status: 'cancelled' }
        );

        // Release stock for all items
        const order = await Order.findById(payment.order_id);
        for (const item of order.items) {
            await Variant.updateOne(
                { _id: item.variant_id },
                {
                    $inc: {
                        'stock.reserved': -item.quantity,
                        'stock.available': +item.quantity
                    }
                }
            );
        }

        // Mark payment as expired
        await Payment.updateOne(
            { _id: payment._id },
            { status: 'expired' }
        );
    }
};
```

### Logging Strategy

```javascript
// Log every critical payment event
logger.info({
    event: 'payment_ipn_received',
    payment_id: payment._id,
    vnp_txn_ref: req.query.vnp_TxnRef,
    response_code: req.query.vnp_ResponseCode,
    timestamp: new Date()
});

logger.info({
    event: 'payment_verified',
    payment_id: payment._id,
    new_status: payment.status,
    order_id: payment.order_id
});

logger.error({
    event: 'payment_verification_failed',
    reason: 'Invalid signature',
    query: req.query
});
```

## Order Lifecycle (STATE MACHINE - MANDATORY)

**Order MUST follow a fixed state machine.** Never update status arbitrarily.

### Overview

```
pending → confirmed → shipping → completed
        ↘ cancelled
```

### States & Meanings

```
pending     → Created order, awaiting payment
confirmed   → Payment successful (IPN triggered)
shipping    → In transit to customer
completed   → Delivery successful

cancelled   → Order cancelled (only from pending)
```

### Transition Rules (ENFORCED)

**Allowed transitions:**

```
pending   → confirmed   (payment success via IPN)
pending   → cancelled   (user cancel OR payment failed)

confirmed → shipping    (admin or system trigger)

shipping  → completed   (delivery confirmation)
```

**Forbidden transitions:**

```
confirmed → cancelled        (NEVER allowed)
shipping  → cancelled        (NEVER allowed)
completed → ANY              (immutable)
cancelled → ANY              (immutable)
```

### Business Rules (CRITICAL)

#### 3.1 Cancel Rule

**Only `pending` orders can be cancelled:**

```javascript
if (order.status !== 'pending') {
    throw new AppError(
        'Cannot cancel non-pending order',
        409,
        'INVALID_ORDER_STATE'
    );
}
```

**Why?** Once payment succeeds, order is locked. Cancellation after payment success requires refund logic.

#### 3.2 Stock Rules by Status

```
pending:
  - stock moved: available → reserved
  - Order not yet confirmed, stock is held

confirmed:
  - stock moved: reserved → sold
  - PERMANENT - no rollback allowed
  - Payment success locked this state

cancelled:
  - stock returned: reserved → available
  - Only happens if payment failed or user cancelled in pending

completed:
  - stock remains: sold
  - Order fulfilled, no changes
```

#### 3.3 Immutability

```
completed:
  - Terminal state, no further updates

cancelled:
  - Terminal state, cannot be revived
```

### Enforcing State Machine (MANDATORY)

**NEVER update status directly:**

```javascript
// ❌ WRONG - Direct update bypasses validation
await Order.updateOne({ _id }, { status: 'completed' });
```

**ALWAYS use service layer with validation:**

```javascript
class OrderService {
    static async transition(orderId, nextState) {
        const order = await Order.findById(orderId);

        if (!order) {
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        // ✅ Define allowed transitions
        const allowed = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['shipping'],
            shipping: ['completed'],
            completed: [],
            cancelled: []
        };

        // ✅ Validate transition
        if (!allowed[order.status].includes(nextState)) {
            throw new AppError(
                `Invalid transition: ${order.status} → ${nextState}`,
                409,
                'INVALID_ORDER_TRANSITION'
            );
        }

        // ✅ Update status
        order.status = nextState;
        return await order.save();
    }

    static async confirmOrder(orderId) {
        return this.transition(orderId, 'confirmed');
    }

    static async cancelOrder(orderId, reason) {
        const order = await Order.findById(orderId);
        
        if (order.status !== 'pending') {
            throw new AppError(
                'Cannot cancel non-pending order',
                409,
                'INVALID_ORDER_STATE'
            );
        }

        order.status = 'cancelled';
        order.cancel_reason = reason;  // 'user_cancel' or 'payment_failed'
        order.cancelled_at = new Date();
        return await order.save();
    }

    static async shipOrder(orderId) {
        return this.transition(orderId, 'shipping');
    }

    static async completeOrder(orderId) {
        return this.transition(orderId, 'completed');
    }
}
```

### Mapping with Payment Flow

**Payment Success (IPN):**

```
IPN confirms payment
→ OrderService.confirmOrder(orderId)
→ Order: pending → confirmed
→ Stock: reserved → sold (finalized)
```

**Payment Failed:**

```
IPN receives failure
→ OrderService.cancelOrder(orderId, 'payment_failed')
→ Order: pending → cancelled
→ Stock: reserved → available (released)
```

### Mapping with Fulfillment

**Start Shipping:**

```
Admin approves order for shipment
→ OrderService.shipOrder(orderId)
→ Order: confirmed → shipping
→ Stock: remains sold (already counted)
```

**Delivery Complete:**

```
Delivery provider confirms
→ OrderService.completeOrder(orderId)
→ Order: shipping → completed
→ Stock: remains sold (finalized)
```

### Recommended Enhancements

#### Timestamp Tracking

```javascript
const orderSchema = new mongoose.Schema({
    // ... other fields

    // Timestamps for each state transition
    created_at: { type: Date, default: Date.now },
    confirmed_at: Date,      // When payment succeeded
    shipped_at: Date,        // When order shipped
    completed_at: Date,      // When order delivered
    cancelled_at: Date,      // When order cancelled
});
```

#### Reason Tracking

```javascript
const orderSchema = new mongoose.Schema({
    // ... other fields

    cancel_reason: {
        type: String,
        enum: ['user_cancel', 'payment_failed', 'out_of_stock', 'other'],
        required: function() { return this.status === 'cancelled'; }
    },

    cancel_reason_note: String  // Additional details
});
```

#### Status Enum (Prevent Typos)

```javascript
// constants.util.js
const ORDER_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    SHIPPING: 'shipping',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

const ORDER_TRANSITIONS = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPING],
    [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.COMPLETED],
    [ORDER_STATUS.COMPLETED]: [],
    [ORDER_STATUS.CANCELLED]: []
};

module.exports = { ORDER_STATUS, ORDER_TRANSITIONS };
```

**Usage in service:**

```javascript
import { ORDER_STATUS, ORDER_TRANSITIONS } from '../../utils/constants.util';

if (!ORDER_TRANSITIONS[order.status].includes(nextState)) {
    throw new AppError(
        `Invalid transition: ${order.status} → ${nextState}`,
        409,
        'INVALID_ORDER_TRANSITION'
    );
}
```

### Critical Invariants (MANDATORY)

- ✅ Order status **MUST follow defined transitions only**
- ✅ Payment success is the **ONLY way** to move pending → confirmed
- ✅ Cancel is **ONLY allowed** in pending status
- ✅ confirmed state means stock is **already sold** (no rollback)
- ✅ completed and cancelled are **terminal states** (immutable)
- ✅ Stock transition is **tied to order status** (no independent stock changes)

### Common Mistakes This Prevents

- ❌ Cancelling order after payment succeeded
- ❌ Shipping order before payment confirmed
- ❌ Double transition (pending directly to completed)
- ❌ Rolling back stock after order is confirmed
- ❌ Updating status arbitrarily from controller (bypassing service)
- ❌ Missing status timestamps for audit trail
- ❌ No reason tracking for cancellations

### Complete Transaction Lifecycle

This section, combined with **Checkout Flow** and **Payment Flow**, provides your complete transaction lifecycle:

```
User adds to cart
  ↓
User checkout
  → Create order (pending)
  → Create payment (pending)
  ↓
VNPay processes payment
  → IPN callback
  ↓
Payment Success
  → OrderService.confirmOrder()
  → Order: pending → confirmed
  → Stock: reserved → sold (finalized)
  ↓
Admin ships order
  → OrderService.shipOrder()
  → Order: confirmed → shipping
  ↓
Delivery provider confirms
  → OrderService.completeOrder()
  → Order: shipping → completed
  ↓
Transaction complete
```

**Or if payment fails:**

```
Payment Failed
  → IPN sends failure
  ↓
OrderService.cancelOrder(orderId, 'payment_failed')
  → Order: pending → cancelled
  → Stock: reserved → available
  ↓
Customer can retry checkout
```

## Orders & Payments Architecture

### Order Status Lifecycle

```
PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
           ↓
         FAILED (payment failed, revert cart)
           ↓
         CANCELED (before shipping)
```

**Transitions**:
- PENDING → PAID: Payment provider webhook
- PAID → PROCESSING: Admin action
- PROCESSING → SHIPPED: Fulfillment system
- SHIPPED → DELIVERED: Tracking system
- PAID → FAILED: Payment timeout/error
- Any → CANCELED: Customer or admin action

### Payment Failure & Rollback Rules

**If payment FAILS** (timeout, rejected, cancelled):

```javascript
// ✅ CORRECT: Rollback state
const rollback = async (orderId, variantId, qty) => {
    // 1. Set order status to FAILED
    await Order.updateOne(
        { _id: orderId },
        { status: 'FAILED' }
    );

    // 2. Restore stock (reverse the checkout deduction)
    await Variant.updateOne(
        { _id: variantId },
        {
            $inc: {
                'stock.available': +qty,      // Restore
                'stock.reserved': -qty        // Release reservation
            }
        }
    );

    // 3. Optional: Cart can be restored for retry (or keep deleted)
    // If keeping cart: Cart still valid for customer to retry payment
};
```

**Rules**:
- **Every failed payment MUST reverse stock** (or you lose inventory)
- **Order.status = FAILED** (not PENDING)
- **Stock reservation released immediately** (not after timeout)
- **Cart cleanup policy**: Define explicitly
  - Option A: Keep cart alive (customer retries easily)
  - Option B: Delete cart (force rebuild on retry)

### Payment Integration Pattern

**External Provider** (Stripe, VNPay, etc.):
1. Client calls `/api/v1/checkout` with order details
2. Service creates Order + Payment with status `PENDING`
3. Service calls payment provider API, returns payment URL/session
4. Client completes payment on provider
5. Provider sends webhook to `/api/v1/payments/webhook/:provider`
6. Webhook handler verifies signature, updates Payment status
7. Payment status → Order status transition

**Webhook verification is MANDATORY**:
```javascript
// ✅ CORRECT: Always verify webhook signature
const verifyPaymentWebhook = (payload, signature, secret) => {
    const computed = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    if (computed !== signature) {
        throw new AppError('Invalid webhook signature', 401, 'WEBHOOK_VERIFICATION_FAILED');
    }
};
```

**Idempotency**: All payment operations must be idempotent (use idempotency key to prevent duplicate charges).

## Database Operations

### Indexes (Performance)

**Products**:
- `product.name` (text search)
- `product.slug` (partial: `{ slug: 1, is_deleted: 1 }`)
- `product.category_id`
- `product.min_price` (range queries)

**Carts**:
- `cart.user_id` (user lookup)
- `cart.session_key` (guest lookup)
- `cart.expired_at` (TTL index, auto-cleanup)

**Orders**:
- `order.user_id`
- `order.status`
- `order.created_at`

### Transactions vs Atomic Ops

**Use transactions for** (future):
- Checkout: cart → order + payment (multi-doc consistency)
- Refunds (financial operations)

**Use atomic operators for** (current):
- Cart additions (`$push`)
- Stock updates (`$inc` with conditions)
- Counters

### Idempotency for Retryable Operations

For payment/order creation (might be retried):

```javascript
const idempotencyKey = `${userId}-${cartId}-${timestamp}`;

// Check if already processed
const existing = await OperationLog.findOne({ idempotencyKey });
if (existing) return existing.result;  // Cached response

// Execute once
const order = await Order.create(data);

// Log the operation
await OperationLog.create({ idempotencyKey, result: order });
```

## Naming Conventions

- **Database fields**: `snake_case` (`user_id`, `created_at`, `is_deleted`)
- **Variables**: `camelCase` (`userId`, `createdAt`)
- **Constants**: `UPPER_SNAKE_CASE` (`JWT_ACCESS_SECRET`)
- **Routes**: `kebab-case` (`/user-addresses`, `/variant-units`)

## API Response Format

```javascript
// Success (single)
{ "success": true, "data": {...} }

// Success (list)
{ "success": true, "data": [...], "pagination": { page, limit, total, totalPages } }

// Error
{ "success": false, "code": "ERROR_CODE", "message": "..." }
```

## Authentication & Tokens

### Token Flow

1. **Login**: Issue access (15m) + refresh (1d) tokens
   ```javascript
   const accessToken = signAccessToken({ userId, roles });
   const refreshToken = signRefreshToken({ userId });
   await TokenRecord.create({ userId, refreshTokenHash: hash(refreshToken) });
   ```

2. **Use**: Send access token in `Authorization: Bearer ...` header

3. **Refresh**: Validate refresh token against DB hash

4. **Logout**: Delete TokenRecord → token rejected on next request

### Single-Device Policy

Currently: New login anywhere = previous sessions invalidated.

```javascript
// On login
await TokenRecord.deleteOne({ userId });  // Revoke old session
await TokenRecord.create({ userId, refreshTokenHash });  // Issue new one
```

**Future multi-device**: Add `device_id` field to TokenRecord, change to `deleteOne({ userId, device_id })`.

## Development Workflow

1. **New module**: Copy `modules/users/` structure as template
2. **Routes**: Mount in `src/routes/index.js`
3. **Validation**: Define Zod schemas in `module.validator.js`
4. **Service**: Static class with business logic, returns DTOs
5. **Mapper**: Transform Mongoose docs before returning
6. **Controller**: asyncHandler-wrapped, delegates to service
7. **Tests**: `npm test`

## Common Pitfalls

- ❌ Forgetting `asyncHandler` → unhandled promise rejection
- ❌ Using `findByIdAndUpdate` for stock → returns doc, not count
- ❌ Skipping validation → bad data in DB
- ❌ Returning raw MongoDB docs → `_id`, `__v` exposed
- ❌ Dynamic routes before specific ones → specific routes unreachable
- ❌ Writing product prices directly → violates caching invariant
- ❌ Modifying `price_at_added` → breaks cart pricing guarantee
- ❌ Stock deduction at cart add → should be at checkout only
- ❌ Read → modify → save pattern → race conditions (use atomic ops)
- ❌ Throwing generic `Error` → no status code or error code
