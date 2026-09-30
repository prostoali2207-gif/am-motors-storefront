import Link from "next/link";

export default function VehicleNotFound() {
  return (
    <>
      <h1>Car not found</h1>
      <p>This car is not listed.</p>
      <p>
        <Link className="text-link" href="/cars">See available cars</Link>
      </p>
    </>
  );
}
