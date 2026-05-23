# Frontend Completion Checklist

Dung checklist nay truoc khi coi mot module FE la xong.

## Dieu Kien Chung

- Co file API rieng cho endpoint module.
- Co React Query hook cho query/mutation, invalidate dung query key sau mutation.
- Co page/component day du workflow chinh cua nguoi dung.
- Co loading, error va empty state ro rang.
- Form ghi du lieu phai validate bang `react-hook-form` va `zod`.
- Payload gui len BE chi gom field BE nhan, khong gui field server tu tinh.
- Route FE phai khop runtime BE va Swagger/docs hien tai.
- Test thu cong voi BE that truoc khi danh dau xong.
- Kiem tra responsive o mobile width va desktop width.
- Lint va build phai pass.

## Contract Can Giu

- Cart guest-first:
  - `GET /carts/guest`
  - `POST /carts/items`
  - `PATCH /carts/items/:itemId`
  - `DELETE /carts/items/:itemId`
  - `DELETE /carts`
  - Add cart chi gui `product_id`, `variant_id`, `unit_id`, `quantity`.
  - Sau login goi `POST /carts/merge`.

- Checkout:
  - Validate cart truoc khi tao order.
  - Tao order bang `cart_id`, `address_snapshot`, `shipping_fee`, `payment_method`, `customer_notes`.
  - COD vao success page sau khi order thanh cong.
  - VNPAY tao order truoc, sau do `POST /payments` voi `order_id` va `provider: vnpay`.

- Account:
  - Huy don gui `reason`.
  - Review sau khi don `DELIVERED` gui `item_id`, `rating`, `comment` qua `/orders/:orderId/review`.
  - Review duoc dat trong orders flow, khong tach thanh standalone write flow khi BE dang chot order-scoped route.

- Admin:
  - `ADMIN/MANAGER`: products, categories, variants, variant units, banners, announcements, shop-info.
  - `ADMIN`: orders, payments, shipments, discounts, users, audit logs.
  - UI guard chi la lop trai nghiem; BE role la nguon dung cuoi.

## Trang Thai Hien Tai

| Module | Trang thai | Con thieu truoc khi goi la full |
| --- | --- | --- |
| UI foundation | Dat nen | Chi bo sung component moi khi workflow can |
| App shell | Dat nen | Kiem tra lai tren mobile sau moi dot them menu |
| Auth | Dat nen | Manual test login/register/forgot/reset voi BE email that |
| Public catalog | Dat nen | Bo sung filter nang cao neu BE mo them field |
| Cart | Dat nen | Test lai merge cart sau login bang guest cart that |
| Checkout | Dat nen | Test COD end-to-end voi san pham that |
| Payment | Dat nen | Test VNPAY sandbox khi co order hop le |
| Account | Dat nen | Test cancel/review tren don PENDING va DELIVERED that |
| Notifications | Dat nen | Test read/delete voi data thong bao that |
| Admin | Nen list/action da co | Form create/edit chi tiet cho tung resource con can lam tiep |

## Manual Test Toi Thieu

- Guest vao products, xem detail, add cart, sua so luong, xoa item, clear cart.
- Login user, kiem tra refresh sau reload, logout clear session, guest cart merge sau login.
- Tao dia chi, checkout COD, vao orders list/detail.
- Huy don hop le, verify loi khi thieu ly do.
- Voi don DELIVERED, gui review hop le va verify loi khi noi dung ngan.
- Checkout VNPAY tao payment URL va trang return refetch order/payment status.
- Admin login bang `ADMIN`, mo tat ca route admin.
- Manager login bang `MANAGER`, chi thay catalog/content/shop-info va khong vao duoc operational admin route.
- Mo cac page chinh o mobile width: home, products, detail, cart, checkout, orders, admin.
