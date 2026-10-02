# Application audit — fixes and additions

## Critical problems found in the submitted project

1. The server forced DNS to Google's public resolvers. That can break local/corporate DNS and was unrelated to the app.
2. The committed backend `.env` contained a placeholder Atlas connection string and a weak demo secret.
3. React used hard-coded `http://localhost:5000` URLs throughout the pages, making deployment awkward.
4. Client-submitted `totalAmount`, `discount` and `netAmount` were trusted by the sales API. A browser request could therefore alter the amount charged.
5. The API deducted stock with `Math.max(0, stock - quantity)`, silently allowing an order to exceed inventory.
6. Deleting a sale did not restore the sold stock.
7. Admin/cashier permissions were mostly cosmetic. The original API did not enforce admin-only actions, and the JWT did not carry/load a role for permission checks.
8. Products were physically deleted, making accidental deletion more destructive than necessary.
9. The original dashboard called product count “Items in Stock” and did not expose total units or inventory value.
10. The original project depended on a large bundled `node_modules` tree. It made the ZIP roughly 39 MB larger than necessary and contained platform-specific native binaries.
11. The original frontend had an unused duplicate top-level stylesheet using Tailwind v4 syntax while the project was configured for Tailwind v3.
12. There was no configured Vite React config, no seed utility, and no root-level setup workflow.
13. PDF invoice support was listed in dependencies but not actually implemented.
14. On small screens the sidebar was hidden with no replacement navigation.

## Completed improvements

- Server-side calculation of subtotal, tax and payable amount from current MongoDB product prices.
- Atomic stock decrement per product with stock-underflow checks.
- Rollback of stock deductions when sale persistence fails.
- Sale cancellation workflow that restores stock.
- Admin-only destructive actions and functional cashier accounts.
- Active/disabled user status checks on every protected request.
- Product archive instead of physical deletion.
- SKU, barcode, cost price, tax percentage, notes and inventory-value support.
- Manual stock adjustment endpoint and UI.
- Search/category/payment filters.
- Dashboard low-stock list, payment revenue chart, recent sales and additional KPIs.
- PDF invoice export from billing and sales history.
- Optional WhatsApp click-to-chat invoice sharing rather than making a phone number mandatory for every bill.
- Session validation after page reload.
- Mobile navigation.
- `.gitignore`, `.env.example`, local `.env` files, Vite config, root scripts, seed script and MIT license.
- Dependency directories removed from the final deliverable.

## Validation performed

- Backend JavaScript syntax check passed for server, middleware, models and routes.
- Frontend/config JavaScript + JSX parsing passed for all source/config files.
- Package manifests and package-lock root metadata were synchronized.
- A full Vite production build could not be executed in this Linux sandbox because the uploaded `node_modules` contains Windows-native optional Rollup/esbuild binaries and external npm registry access is unavailable here. The final ZIP intentionally excludes those dependency folders; running `npm install` on the target machine will install the correct platform binaries before `npm run build`.
