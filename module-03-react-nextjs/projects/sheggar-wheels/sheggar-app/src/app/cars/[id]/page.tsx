
import { Suspense } from "react";
import CarDetailsClient from "./car-details-client";
import { cars } from "@/lib/cars";

export function generateStaticParams() {
  return cars.map((car) => ({
    id: car.id,
  }));
}

async function CarDetailsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CarDetailsClient id={id} />;
}

export default function CarDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="car-detail-page">
          <p>Loading car details...</p>
        </main>
      }
    >
      <CarDetailsContent params={params} />
    </Suspense>
  );
}
