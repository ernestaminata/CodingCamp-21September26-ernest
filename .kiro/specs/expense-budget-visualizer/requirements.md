# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by category, view a running total balance, and visualize spending distribution through a pie chart. The app requires no backend server, stores all data in the browser's Local Storage, and is built with plain HTML, CSS, and Vanilla JavaScript. It can be used as a standalone web page or packaged as a browser extension.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Transaction_List**: The scrollable on-screen list displaying all recorded transactions.
- **Input_Form**: The UI form through which users enter transaction data.
- **Balance_Display**: The UI element at the top of the page that shows the current total of all transaction amounts.
- **Pie_Chart**: The visual chart showing the proportional spending breakdown by category.
- **Storage**: The browser's Local Storage API used to persist transaction data.
- **Category**: A predefined classification label for a transaction — one of: Food, Transport, or Fun.
- **Validator**: The client-side logic component that checks Input_Form field values before submission.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE App SHALL render the Input_Form with three fields: item name (text, maximum 100 characters), amount (number, accepting values from 0.01 to 999,999,999.99), and category (select with options: Food, Transport, Fun).
2. WHEN the user submits the Input_Form, THE Validator SHALL verify that the item name field is not empty, the amount field contains a number between 0.01 and 999,999,999.99, and a category option is selected.
3. IF the Validator detects that any required field is empty or invalid, THEN THE App SHALL display an inline error message adjacent to each offending field identifying the missing or invalid value and SHALL NOT add the transaction.
4. WHEN the Input_Form passes validation, THE App SHALL create a new Transaction record containing the submitted item name, amount, and category, and add it to the Transaction_List.
5. WHEN a Transaction is successfully added, THE App SHALL clear all Input_Form fields and return focus to the item name field within 100 milliseconds.
6. IF the item name field value exceeds 100 characters, THEN THE App SHALL display an inline error message indicating the character limit and SHALL NOT add the transaction.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions so that I can review what I have spent.

#### Acceptance Criteria

1. THE App SHALL render the Transaction_List as a scrollable container displaying all stored Transactions.
2. THE Transaction_List SHALL display each Transaction's item name, amount formatted as a currency symbol followed by two decimal places, and category.
3. IF the Transaction_List contains more entries than the visible area allows, THEN THE App SHALL enable vertical scrolling within the Transaction_List container.
4. THE App SHALL render a delete button alongside each Transaction entry in the Transaction_List.
5. WHEN the user activates the delete button for a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from Storage; IF the Storage removal fails, THEN THE App SHALL retain the Transaction in the list and display an inline error message indicating the deletion could not be saved.
6. WHEN the Transaction_List contains no Transactions, THE App SHALL display a placeholder message indicating there are no recorded transactions.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see the total amount of all my expenses at the top of the page so that I know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL be visible at the top of the App at all times.
2. THE Balance_Display SHALL show the sum of all Transaction amounts formatted as a currency value with exactly 2 decimal places and a currency symbol (e.g., $0.00).
3. WHEN a Transaction is added, THE Balance_Display SHALL update to reflect the new total within 1 second without requiring a page reload.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 1 second without requiring a page reload.
5. WHEN no Transactions exist, THE Balance_Display SHALL show a total of $0.00.
6. IF the sum of all Transaction amounts exceeds 999,999,999.99, THEN THE Balance_Display SHALL show the maximum displayable value with an overflow indicator without truncating or wrapping the currency symbol.

---

### Requirement 4: Spending Distribution Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL render a Pie_Chart in which each Category with a total spent amount greater than zero is represented as a segment whose arc angle equals (category_total / grand_total) × 360 degrees, and Categories with a total spent amount of zero SHALL be omitted from the chart.
2. THE Pie_Chart SHALL assign a unique, pre-defined color to each Category such that no two Categories share the same color (Food, Transport, and Fun each have a distinct color that does not change across renders).
3. WHEN a Transaction is added, THE Pie_Chart SHALL update to reflect the new category totals without requiring a page reload.
4. WHEN a Transaction is deleted, THE Pie_Chart SHALL update to reflect the revised category totals without requiring a page reload.
5. WHEN all Transactions are removed, THE Pie_Chart SHALL display a single full-circle placeholder segment in a neutral color (gray) accompanied by a text message indicating no spending data is available, instead of rendering category segments or producing an error.
6. THE Pie_Chart SHALL include a legend that displays, for each Category currently represented in the chart, its assigned color, its name, and its percentage of total spending rounded to one decimal place.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved automatically so that my data is not lost when I close or refresh the browser tab.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL write the updated Transaction collection to the browser's localStorage within 300ms of the add operation completing.
2. WHEN a Transaction is deleted, THE App SHALL write the updated Transaction collection to the browser's localStorage within 300ms of the delete operation completing.
3. WHEN the App initializes, THE App SHALL read the Transaction collection from localStorage and populate the Transaction_List, Balance_Display, and Pie_Chart with the stored data before rendering any Transaction entries to the user.
4. IF localStorage is unavailable or returns a parse error on initialization, THEN THE App SHALL initialize with an empty Transaction collection and display an inline warning message that does not block interaction with any App controls, and that remains visible until the user dismisses it or adds a new Transaction.

---

### Requirement 6: File and Code Organization

**User Story:** As a developer, I want the project to follow a clear single-file-per-type structure so that the codebase is easy to navigate and maintain.

#### Acceptance Criteria

1. THE App SHALL contain exactly one CSS file located inside a `css/` directory.
2. THE App SHALL contain exactly one JavaScript file located inside a `js/` directory.
3. THE App SHALL be operable as a standalone web page by opening the root HTML file directly in a modern browser (Chrome, Firefox, Edge, Safari) without a backend server, such that all UI elements render without layout breakage and all interactive features function without runtime errors.
4. WHERE the App is packaged as a browser extension, THE App SHALL produce the same functional behavior as the standalone mode without modification to the core HTML, CSS, or JavaScript files.

---

### Requirement 7: Performance and Responsiveness

**User Story:** As a user, I want the app to feel fast and responsive so that adding or deleting transactions does not cause any visible lag.

#### Acceptance Criteria

1. WHILE the Transaction_List contains up to 500 stored Transactions, WHEN the user submits the Input_Form on a browser that is Chrome 120 or later, Firefox 120 or later, or Safari 17 or later, THE App SHALL complete the add operation and reflect the updated Transaction_List, Balance_Display, and Pie_Chart within 200ms measured from form submission to the last visible UI update.
2. WHILE the Transaction_List contains up to 500 stored Transactions, WHEN the user activates a delete button on a browser that is Chrome 120 or later, Firefox 120 or later, or Safari 17 or later, THE App SHALL complete the delete operation and reflect the updated Transaction_List, Balance_Display, and Pie_Chart within 200ms measured from button activation to the last visible UI update.
3. WHILE the persisted data contains up to 500 stored Transactions, WHEN the App initializes on a browser that is Chrome 120 or later, Firefox 120 or later, or Safari 17 or later, THE App SHALL complete the initial render within 500ms measured from page load start to all UI components being visible and interactive.
