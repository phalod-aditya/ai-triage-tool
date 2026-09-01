const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});


export function formatBudgetRange(budgetMin, budgetMax) {
  if (budgetMin == null || budgetMax == null) return "Not provided";
  return `${currencyFormatter.format(budgetMin)} to ${currencyFormatter.format(budgetMax)}`;
}
