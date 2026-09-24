// js/app.js — Expense & Budget Visualizer

// =============================================================================
// Validator module
// Pure functions only — no DOM access, no side effects.
// =============================================================================

const Validator = (function () {

  /** Valid category values (the only three the app supports). */
  const VALID_CATEGORIES = ["Food", "Transport", "Fun"];

  /**
   * Validate a transaction form submission.
   *
   * @param {string} name      - Raw value from the item-name input.
   * @param {string|number} amount   - Raw value from the amount input.
   * @param {string} category  - Raw value from the category select.
   * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
   */
  function validate(name, amount, category) {
    const errors = {};

    // ── Name ────────────────────────────────────────────────────────────────
    // Rule: trimmed length must be between 1 and 100 characters (inclusive).
    const trimmedName = (typeof name === "string") ? name.trim() : "";
    if (trimmedName.length === 0) {
      errors.name = "Item name is required.";
    } else if (trimmedName.length > 100) {
      errors.name = "Item name must be 100 characters or fewer.";
    }

    // ── Amount ───────────────────────────────────────────────────────────────
    // Rule: parseable as a finite number within 0.01–999,999,999.99 (inclusive).
    const parsedAmount = parseFloat(amount);
    if (amount === "" || amount === null || amount === undefined || isNaN(parsedAmount)) {
      errors.amount = "A valid amount is required.";
    } else if (parsedAmount < 0.01) {
      errors.amount = "Amount must be at least $0.01.";
    } else if (parsedAmount > 999_999_999.99) {
      errors.amount = "Amount must not exceed $999,999,999.99.";
    }

    // ── Category ─────────────────────────────────────────────────────────────
    // Rule: must be exactly one of "Food", "Transport", or "Fun".
    if (!VALID_CATEGORIES.includes(category)) {
      errors.category = "Please select a valid category (Food, Transport, or Fun).";
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // Expose public API
  return { validate };

})();

// ---------------------------------------------------------------------------
// Storage module
// Responsible for persisting and restoring the transaction collection using
// the browser's localStorage API.
//
// Key: "evb_transactions"
// Value: JSON-serialized Transaction[]
// ---------------------------------------------------------------------------

const Storage = (function () {
  const KEY = "evb_transactions";

  /**
   * Load the transaction collection from localStorage.
   *
   * Returns the parsed array on success.
   * Returns an empty array when:
   *   - the key does not exist
   *   - the stored value fails JSON.parse
   *   - localStorage itself is inaccessible (e.g. private-browsing quota)
   *
   * @returns {Array} Transaction[]
   */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) {
        // Key not yet set — first visit or cleared storage.
        return [];
      }
      const parsed = JSON.parse(raw);
      // Guard against non-array values (e.g. someone manually set the key).
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      // localStorage inaccessible or JSON parse failure → treat as empty.
      return [];
    }
  }

  /**
   * Persist the transaction collection to localStorage.
   *
   * Errors are caught and swallowed silently; a console warning is emitted
   * so developers can diagnose issues without surfacing noise to users.
   * The in-memory state is always updated before this call, so the UI
   * reflects the change even if the write fails.
   *
   * @param {Array} transactions - Transaction[] to persist
   */
  function save(transactions) {
    try {
      localStorage.setItem(KEY, JSON.stringify(transactions));
    } catch (err) {
      console.warn("evb: localStorage write failed", err);
    }
  }

  return { load, save };
})();

// ---------------------------------------------------------------------------
// formatCurrency — shared pure utility
// Returns a USD-formatted string: "$1,234.50"
// Overflow: if amount exceeds the max displayable value, the balance renderer
// will handle the "+" suffix separately.
// ---------------------------------------------------------------------------
function formatCurrency(amount) {
  return (
    "$" +
    Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// ---------------------------------------------------------------------------
// UI module — all DOM manipulation except list and balance rendering
// (those live in task 5.1 / 5.3)
// ---------------------------------------------------------------------------
const UI = (function () {

  // Internal helpers — resolve the three error span elements once
  function _errorSpan(field) {
    return document.getElementById("error-" + field);
  }

  // -------------------------------------------------------------------------
  // UI.showErrors(errors)
  // errors shape: { name?: string, amount?: string, category?: string }
  // Writes each error message into the matching <span class="field-error">.
  // -------------------------------------------------------------------------
  function showErrors(errors) {
    ["name", "amount", "category"].forEach(function (field) {
      var span = _errorSpan(field);
      if (!span) return;
      if (errors && errors[field]) {
        span.textContent = errors[field];
      }
    });
  }

  // -------------------------------------------------------------------------
  // UI.clearErrors()
  // Empties all three field-error spans so a fresh validation run starts clean.
  // -------------------------------------------------------------------------
  function clearErrors() {
    ["name", "amount", "category"].forEach(function (field) {
      var span = _errorSpan(field);
      if (span) span.textContent = "";
    });
  }

  // -------------------------------------------------------------------------
  // UI.clearForm()
  // Resets the transaction form and returns keyboard focus to the name input.
  // Focus is deferred to the next task (≤100 ms) so the browser has time to
  // finish any in-progress rendering before the focus call fires.
  // -------------------------------------------------------------------------
  function clearForm() {
    var form = document.getElementById("transaction-form");
    if (form) form.reset();
    setTimeout(function () {
      var nameInput = document.getElementById("input-name");
      if (nameInput) nameInput.focus();
    }, 0); // 0 ms satisfies the ≤100 ms requirement and avoids visible delay
  }

  // -------------------------------------------------------------------------
  // UI.showStorageWarning(message)
  // Reveals the #storage-warning banner and sets its message text.
  // The banner uses the HTML `hidden` attribute; removing it makes it visible.
  // -------------------------------------------------------------------------
  function showStorageWarning(message) {
    var banner = document.getElementById("storage-warning");
    var msgSpan = document.getElementById("storage-warning-message");
    if (msgSpan) msgSpan.textContent = message || "";
    if (banner) banner.removeAttribute("hidden");
  }

  // -------------------------------------------------------------------------
  // UI.hideStorageWarning()
  // Re-applies the `hidden` attribute to collapse the banner.
  // -------------------------------------------------------------------------
  function hideStorageWarning() {
    var banner = document.getElementById("storage-warning");
    if (banner) banner.setAttribute("hidden", "");
  }

  // -------------------------------------------------------------------------
  // UI.renderBalance(transactions)
  // Computes the sum of all transaction amounts and updates #balance-display.
  //
  // Overflow rule (Requirement 3.6): if sum > 999,999,999.99 display the
  // capped string "$999,999,999.99+" so the currency symbol is never
  // truncated or wrapped.
  //
  // Empty list (Requirement 3.5): displays "$0.00".
  // -------------------------------------------------------------------------
  const MAX_BALANCE = 999_999_999.99;

  function renderBalance(transactions) {
    var el = document.getElementById("balance-display");
    if (!el) return;

    var sum = 0;
    if (Array.isArray(transactions)) {
      for (var i = 0; i < transactions.length; i++) {
        sum += transactions[i].amount;
      }
    }

    if (sum > MAX_BALANCE) {
      el.textContent = "$999,999,999.99+";
    } else {
      el.textContent = formatCurrency(sum);
    }
  }

  // -------------------------------------------------------------------------
  // UI.renderList(transactions)
  // Clears and fully re-renders the #transaction-list container.
  //
  // - When the array is empty, the #list-placeholder paragraph is shown and
  //   no item rows are created (Requirement 2.6).
  // - When items exist, the placeholder is hidden and each transaction is
  //   rendered as a role="listitem" div containing:
  //     • item name          (Requirement 2.2)
  //     • formatted amount   (Requirement 2.2)
  //     • category           (Requirement 2.2)
  //     • delete button with data-id set to transaction.id  (Requirement 2.4)
  // -------------------------------------------------------------------------
  function renderList(transactions) {
    var list        = document.getElementById("transaction-list");
    var placeholder = document.getElementById("list-placeholder");
    if (!list) return;

    // Remove all previously rendered item rows (leave the placeholder in place).
    var existingRows = list.querySelectorAll("[role='listitem']");
    existingRows.forEach(function (el) { el.parentNode.removeChild(el); });

    if (!transactions || transactions.length === 0) {
      // Show the placeholder (Requirement 2.6).
      if (placeholder) placeholder.removeAttribute("hidden");
      return;
    }

    // Hide the placeholder and render transaction rows (Requirements 2.1–2.4).
    if (placeholder) placeholder.setAttribute("hidden", "");

    transactions.forEach(function (tx) {
      var row = document.createElement("div");
      row.setAttribute("role", "listitem");
      row.className = "transaction-item";
      row.dataset.id = tx.id;

      // Item name (Requirement 2.2)
      var nameEl = document.createElement("span");
      nameEl.className = "tx-name";
      nameEl.textContent = tx.name;

      // Amount formatted as currency (Requirement 2.2)
      var amountEl = document.createElement("span");
      amountEl.className = "tx-amount";
      amountEl.textContent = formatCurrency(tx.amount);

      // Category (Requirement 2.2)
      var categoryEl = document.createElement("span");
      categoryEl.className = "tx-category";
      categoryEl.dataset.category = tx.category;  // used by CSS badge coloring
      categoryEl.textContent = tx.category;

      // Delete button with data-id attribute (Requirement 2.4)
      var deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-delete";
      deleteBtn.dataset.id = tx.id;
      deleteBtn.setAttribute("aria-label", "Delete transaction: " + tx.name);
      deleteBtn.textContent = "Delete";

      row.appendChild(nameEl);
      row.appendChild(amountEl);
      row.appendChild(categoryEl);
      row.appendChild(deleteBtn);

      list.appendChild(row);
    });
  }

  // -------------------------------------------------------------------------
  // Bind the dismiss button on module load (runs once when the script
  // executes; the button already exists in the static HTML).
  // -------------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    var dismissBtn = document.getElementById("storage-warning-dismiss");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", function () {
        hideStorageWarning();
      });
    }
  });

  // Public API
  return {
    showErrors:          showErrors,
    clearErrors:         clearErrors,
    clearForm:           clearForm,
    showStorageWarning:  showStorageWarning,
    hideStorageWarning:  hideStorageWarning,
    renderBalance:       renderBalance,
    renderList:          renderList,
  };
}());

// ---------------------------------------------------------------------------
// ChartManager module
// Owns the Chart.js pie chart instance. Handles graceful degradation when
// Chart.js is not available (e.g. CDN failure).
// ---------------------------------------------------------------------------
const ChartManager = (function () {

  // Predefined, immutable category colors (Requirements 4.2).
  const CATEGORY_COLORS = {
    Food:      "#F97316",  // orange
    Transport: "#3B82F6",  // blue
    Fun:       "#A855F7",  // purple
  };

  // The live Chart.js instance; populated by init(), used by update().
  var _chart = null;

  // -------------------------------------------------------------------------
  // ChartManager.init(canvasElement)
  // Creates the Chart.js pie chart on the supplied canvas.
  // If window.Chart is unavailable, hides the chart container and reveals
  // the fallback message instead.
  // -------------------------------------------------------------------------
  function init(canvasElement) {
    // ── Guard: Chart.js CDN may have failed to load ────────────────────────
    if (typeof window.Chart === "undefined") {
      var container = document.getElementById("chart-container");
      if (container) container.setAttribute("hidden", "");

      var fallback = document.getElementById("chart-unavailable");
      if (fallback) fallback.removeAttribute("hidden");

      return; // nothing more to do without the library
    }

    // ── Create the pie chart instance with empty initial data ──────────────
    _chart = new window.Chart(canvasElement, {
      type: "pie",
      data: {
        labels: ["No data"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#D1D5DB"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              // Legend labels are managed by ChartManager.update();
              // padding keeps entries readable.
              padding: 16,
              generateLabels: function (chart) {
                // Default label generation — update() will override data
                // so the built-in labels reflect whatever is in chart.data.
                return window.Chart.overrides.pie.plugins.legend.labels.generateLabels(chart);
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                // Tooltip shows the raw amount, not percentage.
                var label = context.label || "";
                var value = context.parsed;
                return label + ": $" + Number(value).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
              },
            },
          },
        },
      },
    });
  }

  // -------------------------------------------------------------------------
  // ChartManager.update(transactions)
  // Recomputes per-category totals from the supplied transaction array and
  // pushes fresh data into the live Chart.js instance.
  //
  // Requirements 4.1, 4.2, 4.5, 4.6
  // -------------------------------------------------------------------------
  function update(transactions) {
    // No-op when Chart.js failed to load (init() sets _chart to null).
    if (!_chart) return;

    // ── Step 1: Compute per-category totals ─────────────────────────────────
    var categoryTotals = { Food: 0, Transport: 0, Fun: 0 };
    if (Array.isArray(transactions)) {
      transactions.forEach(function (tx) {
        if (categoryTotals.hasOwnProperty(tx.category)) {
          categoryTotals[tx.category] += tx.amount;
        }
      });
    }

    // ── Step 2: Determine active categories (total > 0) ─────────────────────
    var activeCats = Object.keys(categoryTotals).filter(function (cat) {
      return categoryTotals[cat] > 0;
    });

    // ── Step 3: Build chart data ─────────────────────────────────────────────
    if (activeCats.length === 0) {
      // Placeholder state — no transactions yet (Requirement 4.5).
      _chart.data.labels                        = ["No data"];
      _chart.data.datasets[0].data              = [1];
      _chart.data.datasets[0].backgroundColor   = ["#D1D5DB"];
    } else {
      // Grand total used to compute legend percentages (Requirement 4.6).
      var grandTotal = activeCats.reduce(function (sum, cat) {
        return sum + categoryTotals[cat];
      }, 0);

      // Labels include the category name and its share as a percentage.
      // Percentage = Math.round((cat_total / grand_total) * 1000) / 10
      _chart.data.labels = activeCats.map(function (cat) {
        var pct = Math.round((categoryTotals[cat] / grandTotal) * 1000) / 10;
        return cat + " (" + pct.toFixed(1) + "%)";
      });

      // Raw amounts as dataset values (Requirement 4.1).
      _chart.data.datasets[0].data = activeCats.map(function (cat) {
        return categoryTotals[cat];
      });

      // Fixed, predefined colors — deterministic across all calls (Requirement 4.2).
      _chart.data.datasets[0].backgroundColor = activeCats.map(function (cat) {
        return CATEGORY_COLORS[cat];
      });
    }

    // ── Step 4: Commit the changes to Chart.js ───────────────────────────────
    _chart.update();
  }

  // Public API
  return {
    init:            init,
    update:          update,
    CATEGORY_COLORS: CATEGORY_COLORS,
    getChart:        function () { return _chart; },
  };

}());

// ---------------------------------------------------------------------------
// App State — single source of truth
// ---------------------------------------------------------------------------
var state = {
  transactions: [],
};

// ---------------------------------------------------------------------------
// init — wires everything together on DOMContentLoaded
// ---------------------------------------------------------------------------
function init() {

  // ── 1. Load persisted transactions (Requirements 5.1, 5.3, 5.4) ──────────
  try {
    var loaded = Storage.load();
    if (Array.isArray(loaded)) {
      state.transactions = loaded;
    } else {
      // Storage returned something unexpected (non-array) — treat as empty.
      state.transactions = [];
      UI.showStorageWarning(
        "Your transactions could not be loaded. Storage may be unavailable."
      );
    }
  } catch (_err) {
    // Storage.load() itself threw — localStorage inaccessible.
    state.transactions = [];
    UI.showStorageWarning(
      "Your transactions could not be loaded. Storage may be unavailable."
    );
  }

  // ── 2. Paint the initial UI ───────────────────────────────────────────────
  UI.renderList(state.transactions);
  UI.renderBalance(state.transactions);
  ChartManager.init(document.getElementById("pie-chart"));
  ChartManager.update(state.transactions);

  // ── 3. Bind form submit handler ───────────────────────────────────────────
  var form = document.getElementById("transaction-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      // Read raw field values
      var nameInput     = document.getElementById("input-name");
      var amountInput   = document.getElementById("input-amount");
      var categoryInput = document.getElementById("input-category");

      var name     = nameInput     ? nameInput.value     : "";
      var amount   = amountInput   ? amountInput.value   : "";
      var category = categoryInput ? categoryInput.value : "";

      // Clear stale errors before re-validating (Requirement 1.3)
      UI.clearErrors();

      // Validate
      var result = Validator.validate(name, amount, category);

      if (!result.valid) {
        // Show inline error messages and abort (Requirements 1.2, 1.3, 1.6)
        UI.showErrors(result.errors);
        return;
      }

      // Build the new Transaction object (Requirement 1.4)
      var transaction = {
        id:       crypto.randomUUID(),
        name:     name.trim(),
        amount:   parseFloat(amount),
        category: category,
      };

      // Mutate state
      state.transactions.push(transaction);

      // Persist (Requirement 5.1)
      Storage.save(state.transactions);

      // Re-render all UI regions (Requirements 1.4, 3.3, 4.3)
      UI.renderList(state.transactions);
      UI.renderBalance(state.transactions);
      ChartManager.update(state.transactions);

      // Clear form and move focus back to name input (Requirement 1.5)
      UI.clearForm();

      // Dismiss any storage warning that may be visible (Requirement 5.4)
      UI.hideStorageWarning();
    });
  }

  // ── 4. Bind delete handler via event delegation on #transaction-list ─────
  //       (Requirements 2.5, 3.3, 3.4, 4.3, 4.4, 5.2)
  var txList = document.getElementById("transaction-list");
  if (txList) {
    txList.addEventListener("click", function (e) {
      // Resolve the clicked element: support clicks on the button or its children
      var btn = e.target.classList.contains("btn-delete")
        ? e.target
        : e.target.closest(".btn-delete");

      if (!btn) return; // Click was not on a delete button

      var id = btn.dataset.id;
      if (!id) return;

      // Find the transaction in state
      var idx = -1;
      for (var i = 0; i < state.transactions.length; i++) {
        if (state.transactions[i].id === id) {
          idx = i;
          break;
        }
      }
      if (idx === -1) return; // Transaction not found (shouldn't happen)

      // Store for potential rollback
      var removed = state.transactions[idx];

      // Remove from in-memory state
      state.transactions.splice(idx, 1);

      // Attempt to persist the change (Requirement 5.2)
      try {
        Storage.save(state.transactions);
      } catch (err) {
        // Save failed — roll back the in-memory deletion
        state.transactions.splice(idx, 0, removed);
        // Re-render list to restore the row, then show inline error on that row
        UI.renderList(state.transactions);
        var row = document.querySelector("div[data-id=\"" + id + "\"]");
        if (row) {
          var errSpan = document.createElement("span");
          errSpan.className = "delete-error";
          errSpan.textContent = "Deletion could not be saved. Please try again.";
          row.appendChild(errSpan);
        }
        return;
      }

      // Save succeeded — re-render all UI regions (Requirements 3.3, 3.4, 4.3, 4.4)
      UI.renderList(state.transactions);
      UI.renderBalance(state.transactions);
      ChartManager.update(state.transactions);
    });
  }
}

// ---------------------------------------------------------------------------
// Boot — run init after the DOM is ready.
// (The UI module registers its own DOMContentLoaded listener for the dismiss
// button; multiple listeners on the same event are fully supported.)
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", init);
