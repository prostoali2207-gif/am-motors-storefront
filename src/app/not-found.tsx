import Link from "next/link";

export default function NotFound() {
  return (
    <section className="status-page">
      <h1 className="page-title">Page not found</h1>
      <p>This page does not exist.</p>
      <p>
        <Link className="text-link" href="/cars">
          See cars in stock
        </Link>
      </p>
    </section>
  );
}
