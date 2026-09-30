import Link from "next/link";

export default function VehicleNotFound() {
  return (
    <section className="status-page">
      <h1 className="page-title">Car not found</h1>
      <p>This car is not listed.</p>
      <p>
        <Link className="text-link" href="/cars">
          See cars in stock
        </Link>
      </p>
    </section>
  );
}
