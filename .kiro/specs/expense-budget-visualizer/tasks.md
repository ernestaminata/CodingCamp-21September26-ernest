# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a pure client-side single-page expense tracker using HTML, CSS, and Vanilla JavaScript. The app is organized into three deliverable files (`index.html`, `css/styles.css`, `js/app.js`) with Chart.js v4 loaded from CDN. Implementation follows the unidirectional data flow architecture: user action → Validator → Storage → UI + ChartManager.

## Tasks

- [x] 1. Scaffold file structure and HTML shell
  - Create `index.html` at the project root with semantic HTML structure
  - Include `<link>` to `css/styles.css`, `<script>` tag for Chart.js v4 CDN, and `<script defer>` for `js/app.js`
  - Add all required DOM elements: Input_Form (name, amount, category fields + submit button), field error `<span>` placeholders, Balance_Display, Transaction_List container, pie chart `<canvas id="pie-chart">`, storage warning banner (hidden by default), chart unavailable fallback text (hidden by default)
  - Create `css/styles.css` as an empty file inside a `css/` directory
  - Create `js/app.js` as an empty file inside a `js/` directory
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Implement the `Storage` module
  - [x] 2.1 Write the `Storage` module in `js/app.js`
    - Implement `Storage.load()` — reads key `"evb_transactions"` from `localStorage`, parses JSON, returns `[]` on any error (missing key, parse failure, `localStorage` inaccessible)
    - Implement `Storage.save(transactions)` — serializes the array to JSON, writes to `localStorage`, catches and silently swallows write errors while emitting `console.warn("evb: localStorage write failed", err)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 2.2 Write property test for `Storage` round-trip (Property 12)
    - **Property 12: localStorage round-trip restores an identical transaction collection**
    - **Validates: Requirements 5.3**
    - Use `fc.array(validTransactionArb)` — call `Storage.save(arr)` then assert `Storage.load()` returns a structurally equal array

- [x] 3. Implement the `Validator` module
  - [x] 3.1 Write the `Validator` module in `js/app.js`
    - Implement `Validator.validate(name, amount, category)` returning `{ valid: boolean, errors: { name?, amount?, category? } }`
    - Name rule: trimmed length must be 1–100 characters
    - Amount rule: parseable as a number and within 0.01–999,999,999.99 (inclusive)
    - Category rule: must be exactly one of `"Food"`, `"Transport"`, `"Fun"`
    - _Requirements: 1.2, 1.3, 1.6_

  - [ ]* 3.2 Write property test for Validator — valid inputs (Property 1)
    - **Property 1: Validator accepts all valid inputs**
    - **Validates: Requirements 1.2**
    - Use `fc.string({minLength:1, maxLength:100})`, `fc.float({min:0.01, max:999999999.99})`, `fc.constantFrom("Food","Transport","Fun")` — assert `result.valid === true`

  - [ ]* 3.3 Write property test for Validator — invalid inputs (Property 2)
    - **Property 2: Validator rejects all invalid inputs**
    - **Validates: Requirements 1.2, 1.3, 1.6**
    - Generate inputs where at least one field is invalid; assert `result.valid === false` and `errors` contains an entry for every offending field

- [x] 4. Implement shared utility and `UI` module (non-list rendering)
  - [x] 4.1 Implement `formatCurrency` and `UI` helper methods
    - Write `formatCurrency(amount)` using `Number.toLocaleString` with `minimumFractionDigits: 2, maximumFractionDigits: 2`, prefixed with `"$"`
    - Implement `UI.showErrors(errors)` — inserts error text into the `<span class="field-error">` adjacent to each field
    - Implement `UI.clearErrors()` — clears all field-error spans
    - Implement `UI.clearForm()` — resets all form fields and returns focus to the name input within 100ms
    - Implement `UI.showStorageWarning(message)` — makes the warning banner visible with the provided message
    - Implement `UI.hideStorageWarning()` — hides the warning banner
    - _Requirements: 1.3, 1.5, 2.2, 5.4_

  - [ ]* 4.2 Write property test for `formatCurrency` (Property 5)
    - **Property 5: Currency formatting always produces two decimal places with a dollar prefix**
    - **Validates: Requirements 2.2, 3.2**
    - Use `fc.float({min:0, max:999999999.99})` — assert result starts with `"$"` and ends with two decimal digits separated by `"."`

- [x] 5. Implement `UI.renderBalance` and `UI.renderList`
  - [x] 5.1 Implement `UI.renderBalance(transactions)`
    - Compute sum of all transaction amounts
    - If sum exceeds 999,999,999.99, display `"$999,999,999.99+"` in Balance_Display
    - Otherwise display `formatCurrency(sum)`; display `"$0.00"` when list is empty
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

  - [ ]* 5.2 Write property test for balance display (Property 8)
    - **Property 8: Balance display always equals the formatted sum of all transaction amounts**
    - **Validates: Requirements 3.2, 3.5**
    - Use `fc.array(validTransactionArb)` — assert rendered balance equals `formatCurrency(sum)`; empty array → `"$0.00"`

  - [x] 5.3 Implement `UI.renderList(transactions)`
    - Clear and re-render the Transaction_List container
    - Each row shows item name, `formatCurrency(amount)`, category, and a delete button with `data-id` attribute set to `transaction.id`
    - When list is empty, show placeholder message (Requirement 2.6)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [ ]* 5.4 Write property test for delete button count (Property 6)
    - **Property 6: Transaction list renders exactly one delete button per transaction**
    - **Validates: Requirements 2.4**
    - Use `fc.array(validTransactionArb, {maxLength:50})` — assert number of delete button elements equals `transactions.length`

- [x] 6. Implement `ChartManager` module
  - [x] 6.1 Write `ChartManager.init(canvasElement)`
    - Check `window.Chart` is defined; if not, hide chart container and show `"Chart unavailable — could not load charting library."` fallback text
    - Create a Chart.js v4 pie chart instance on the canvas element with empty data
    - Define `CATEGORY_COLORS = { Food: "#F97316", Transport: "#3B82F6", Fun: "#A855F7" }`
    - _Requirements: 4.1, 4.2_

  - [x] 6.2 Write `ChartManager.update(transactions)`
    - Compute `categoryTotals` for Food, Transport, Fun
    - Set `activeCats` to categories where total > 0
    - When `activeCats` is empty: set labels `["No data"]`, data `[1]`, backgroundColor `["#D1D5DB"]`
    - Otherwise: set labels/data/backgroundColor from `activeCats`; compute legend percentages as `Math.round((cat_total / grand_total) * 1000) / 10`
    - Call `chart.update()`
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

  - [ ]* 6.3 Write property test for chart segment proportions (Property 9)
    - **Property 9: Chart segment data contains exactly the active categories, proportional to spending**
    - **Validates: Requirements 4.1, 4.5**
    - Use `fc.array(validTransactionArb)` — assert only categories with total > 0 appear; each segment / sum equals category_total / grand_total within floating-point tolerance; empty list → single placeholder segment

  - [ ]* 6.4 Write property test for category color determinism (Property 10)
    - **Property 10: Category colors are deterministic, predefined, and mutually distinct**
    - **Validates: Requirements 4.2**
    - Use `fc.array(validTransactionArb)`, call `ChartManager.update` multiple times — assert Food always `"#F97316"`, Transport always `"#3B82F6"`, Fun always `"#A855F7"`, no two categories share a color

  - [ ]* 6.5 Write property test for legend percentages (Property 11)
    - **Property 11: Legend percentages equal category share of total rounded to one decimal place**
    - **Validates: Requirements 4.6**
    - Use `fc.array(validTransactionArb, {minLength:1})` — assert each category percentage equals `Math.round((cat_total / grand_total) * 1000) / 10`

- [x] 7. Checkpoint — core modules complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the `init` controller and event bindings
  - [x] 8.1 Write the `init` function and form submit handler
    - On `DOMContentLoaded`, call `Storage.load()` and assign result to `state.transactions`
    - If `Storage.load()` throws or returns a non-array (localStorage unavailable / parse error), set `state.transactions = []` and call `UI.showStorageWarning("Your transactions could not be loaded. Storage may be unavailable.")`
    - Call `UI.renderList`, `UI.renderBalance`, `ChartManager.init`, `ChartManager.update` to paint initial state
    - Bind form `submit`: call `UI.clearErrors()`, run `Validator.validate`, on invalid call `UI.showErrors(errors)` and return; on valid, create a Transaction with `crypto.randomUUID()`, push to `state.transactions`, call `Storage.save`, call `UI.renderList` + `UI.renderBalance` + `ChartManager.update`, then `UI.clearForm()` and `UI.hideStorageWarning()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 5.1, 5.3, 5.4_

  - [ ]* 8.2 Write property test for valid add grows list by one (Property 3)
    - **Property 3: Valid submission grows the transaction list by exactly one**
    - **Validates: Requirements 1.4**
    - Use `fc.array(validTransactionArb)` + one valid new entry — assert list length is N+1 and last entry matches submitted values

  - [ ]* 8.3 Write property test for add clears form fields (Property 4)
    - **Property 4: Successful add clears all form fields**
    - **Validates: Requirements 1.5**
    - Use any valid (name, amount, category) triple — after submit, assert all three form fields are empty/reset

  - [x] 8.4 Write the delete event handler (event delegation)
    - Bind click event on the Transaction_List container using event delegation
    - On delete button click: find the transaction by `data-id`, remove from `state.transactions`, attempt `Storage.save`
    - If `Storage.save` throws, re-insert the transaction at its original index and display an inline error on the list item: `"Deletion could not be saved. Please try again."`
    - If save succeeds, call `UI.renderList` + `UI.renderBalance` + `ChartManager.update`
    - _Requirements: 2.5, 3.3, 3.4, 4.3, 4.4, 5.2_

  - [ ]* 8.5 Write property test for delete reduces list by one (Property 7)
    - **Property 7: Delete reduces list size by one and removes entry from storage**
    - **Validates: Requirements 2.5**
    - Use `fc.array(validTransactionArb, {minLength:1})` + random index — assert list length is N-1 and deleted transaction no longer present in memory or localStorage

- [x] 9. Apply CSS styling
  - Style the overall page layout (centered container, header with Balance_Display)
  - Style the Input_Form: field labels, inputs, select, submit button, and `.field-error` spans (red inline error text)
  - Style the Transaction_List: scrollable container, individual row layout (name, amount, category, delete button)
  - Style the storage warning banner (dismissible, non-blocking, positioned above the form)
  - Style the Pie_Chart container and chart unavailable fallback text
  - Ensure the layout does not break at common viewport widths and all interactive controls remain accessible (sufficient color contrast, visible focus rings)
  - _Requirements: 2.3, 6.3_

- [x] 10. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with Vitest or Jest as the runner; add `package.json` dev-dependencies separately — no test tooling is included in the deliverable files
- Checkpoints ensure incremental validation before wiring is complete
- All DOM mutations happen through the `UI` module; the `init` controller owns state and orchestrates calls

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "3.3", "4.2", "5.1", "5.3", "6.1"] },
    { "id": 2, "tasks": ["5.2", "5.4", "6.2"] },
    { "id": 3, "tasks": ["6.3", "6.4", "6.5", "8.1"] },
    { "id": 4, "tasks": ["8.2", "8.3", "8.4"] },
    { "id": 5, "tasks": ["8.5"] }
  ]
}
```
