/** Truthful state when inventory cannot be read. Never presented as "no cars". */
export function InventoryUnavailable() {
  return (
    <section className="notice" role="status" aria-labelledby="inventory-unavailable-heading">
      <h2 id="inventory-unavailable-heading">Inventory is temporarily unavailable</h2>
      <p>We can&apos;t show our cars right now. Please try again later.</p>
    </section>
  );
}
