"use client";

// import Image from "next/image";
import Link from "next/link";
import Card from "../components/ui/Card";

export default function FrontPage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif text-white">
            Noreen
          </Link>
          <div className="space-x-6 text-white">
            <Link href="/" className="hover:opacity-80">
              HOME
            </Link>
            <Link href="/about" className="hover:opacity-80">
              ABOUT
            </Link>
            <Link href="/packages" className="hover:opacity-80">
              PACKAGES
            </Link>
            <Link href="/portfolio" className="hover:opacity-80">
              PORTFOLIO
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative">
        <div className="relative h-screen">
          {/* <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-ZmkrPpmzkl64xxdC2crLuIrjLwAO32.png"
            alt="Wedding couple in front of cathedral"
            fill
            className="object-cover"
            priority
          /> */}
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
            <h1 className="text-4xl md:text-6xl font-serif max-w-4xl leading-tight">
              CREATE SPECIAL MOMENTS FOR YOUR EVENT
            </h1>
            <p className="mt-6 max-w-2xl text-lg opacity-90">
              Lorem Ipsum Is Simply Dummy Text Of The Printing And Typesetting
              Industry. Lorem Ipsum Has Been The Industry&apos;s Standard Dummy
              Text Ever Since.
            </p>
          </div>
        </div>
        {/* Curved bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
            preserveAspectRatio="none"
          >
            <path d="M0 120L1440 120C1440 120 1440 40 720 40C0 40 0 120 0 120Z" />
          </svg>
        </div>
      </div>

      {/* Packages Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-serif text-center mb-12">PACKAGES</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-[3/4] bg-gray-100 rounded-t-lg" />
                <div className="p-6">
                  <h3 className="text-xl font-serif text-center">
                    Package {i}
                  </h3>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
