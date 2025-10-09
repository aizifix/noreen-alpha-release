"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/logo.png";
import { Button } from "@/components/ui/button";
import { api } from "../config/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  Users,
  MapPin,
  Star,
  ArrowRight,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Gift,
  Package,
  CheckCircle,
} from "lucide-react";

interface PackageData {
  package_id: number;
  package_title: string;
  package_description: string;
  package_price: number;
  guest_capacity: number;
  created_by_name: string;
  is_active: number;
  component_count: number;
  venue_count: number;
  freebie_count: number;
  event_type_names: string[];
  components: {
    component_name: string;
    component_price: number;
  }[];
  freebies: {
    freebie_name: string;
    freebie_description: string;
    freebie_value: number;
  }[];
  venue_previews?: Array<{
    venue_id: number;
    venue_title: string;
    venue_location: string;
    venue_capacity: number;
    venue_price: number;
    venue_profile_picture: string | null;
    venue_cover_photo: string | null;
  }>;
  created_at: string;
}

interface PackageDetails {
  package_id: number;
  package_title: string;
  package_description: string;
  package_price: number;
  guest_capacity: number;
  event_type_names: string[];
  components: {
    component_name: string;
    component_price: number;
  }[];
  freebies: {
    freebie_name: string;
    freebie_description: string;
    freebie_value: number;
  }[];
  venue_previews?: Array<{
    venue_id: number;
    venue_title: string;
    venue_location: string;
    venue_capacity: number;
    venue_price: number;
    venue_profile_picture: string | null;
    venue_cover_photo: string | null;
  }>;
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [currentPackageIndex, setCurrentPackageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<PackageDetails | null>(
    null
  );
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isPackageLoading, setIsPackageLoading] = useState(false);
  const [currentVenueIndex, setCurrentVenueIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const handleSmoothScroll = (
    event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
    targetId: string
  ) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (!target) return;
    const y = target.getBoundingClientRect().top + window.pageYOffset - 80; // offset for sticky nav
    window.scrollTo({ top: y, behavior: "smooth" });
    setIsMenuOpen(false);
  };

  // Fetch packages on component mount
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setIsLoading(true);
        const response = await api.client.getAllPackages();

        if (response.data.status === "success") {
          setPackages(response.data.packages || []);
        }
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackages();
  }, []);

  // simple mount animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll carousel
  useEffect(() => {
    if (packages.length > 0) {
      const interval = setInterval(() => {
        setCurrentPackageIndex((prev: number) => (prev + 1) % packages.length);
      }, 5000); // Auto-scroll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [packages.length]);

  const nextPackage = () => {
    setCurrentPackageIndex((prev: number) => (prev + 1) % packages.length);
  };

  const prevPackage = () => {
    setCurrentPackageIndex(
      (prev: number) => (prev - 1 + packages.length) % packages.length
    );
  };

  const goToPackage = (index: number) => {
    setCurrentPackageIndex(index);
  };

  const fetchPackageDetails = async (packageId: number) => {
    try {
      setIsPackageLoading(true);
      const response = await api.client.getPackageDetails(packageId);

      if (response.data.status === "success") {
        const packageData = response.data.package;
        const transformedPackage = {
          ...packageData,
          venue_previews: packageData.venues?.map((venue: any) => ({
            venue_id: venue.venue_id,
            venue_title: venue.venue_title,
            venue_location: venue.venue_location,
            venue_capacity: venue.venue_capacity,
            venue_price: venue.total_price,
            venue_profile_picture: venue.venue_profile_picture,
            venue_cover_photo: venue.venue_cover_photo,
          })),
        };
        setSelectedPackage(transformedPackage);
        setIsPackageModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching package details:", error);
    } finally {
      setIsPackageLoading(false);
    }
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;

    // If the image path already contains a full URL, use it as is
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    // Use the serve-image.php script for proper image serving
    return `https://noreen-events.online/noreen-events/serve-image.php?path=${encodeURIComponent(imagePath)}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="text-2xl font-bold text-[#334746]">
                <Image src={Logo} alt="Noreen Logo" width={100} height={100} />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <Link
                  href="#features"
                  onClick={(e) => handleSmoothScroll(e, "features")}
                  className="text-gray-700 hover:text-brand-500 transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="#services"
                  onClick={(e) => handleSmoothScroll(e, "services")}
                  className="text-gray-700 hover:text-brand-500 transition-colors"
                >
                  Services
                </Link>
                <Link
                  href="#gallery"
                  onClick={(e) => handleSmoothScroll(e, "gallery")}
                  className="text-gray-700 hover:text-brand-500 transition-colors"
                >
                  Gallery
                </Link>
                <Link
                  href="#location"
                  onClick={(e) => handleSmoothScroll(e, "location")}
                  className="text-gray-700 hover:text-brand-500 transition-colors"
                >
                  Location
                </Link>
                <Link
                  href="#about"
                  onClick={(e) => handleSmoothScroll(e, "about")}
                  className="text-gray-700 hover:text-brand-500 transition-colors"
                >
                  About
                </Link>
                <Link
                  href="#contact"
                  onClick={(e) => handleSmoothScroll(e, "contact")}
                  className="text-gray-700 hover:text-brand-500 transition-colors"
                >
                  Contact
                </Link>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/auth/login">
                <Button className="border border-[#334746] text-[#334746] hover:bg-[#334746] hover:text-white bg-white">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                className="bg-transparent hover:bg-gray-100 p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                <span className="relative block w-6 h-6">
                  <Menu
                    className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
                      isMenuOpen
                        ? "opacity-0 scale-75 rotate-90"
                        : "opacity-100 scale-100 rotate-0"
                    }`}
                  />
                  <X
                    className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
                      isMenuOpen
                        ? "opacity-100 scale-100 rotate-0"
                        : "opacity-0 scale-75 -rotate-90"
                    }`}
                  />
                </span>
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <Link
                  href="#features"
                  onClick={(e) => handleSmoothScroll(e, "features")}
                  className="block px-3 py-2 text-gray-700 hover:text-[#334746]"
                >
                  Features
                </Link>
                <Link
                  href="#services"
                  onClick={(e) => handleSmoothScroll(e, "services")}
                  className="block px-3 py-2 text-gray-700 hover:text-[#334746]"
                >
                  Services
                </Link>
                <Link
                  href="#gallery"
                  onClick={(e) => handleSmoothScroll(e, "gallery")}
                  className="block px-3 py-2 text-gray-700 hover:text-[#334746]"
                >
                  Gallery
                </Link>
                <Link
                  href="#location"
                  onClick={(e) => handleSmoothScroll(e, "location")}
                  className="block px-3 py-2 text-gray-700 hover:text-[#334746]"
                >
                  Location
                </Link>
                <Link
                  href="#about"
                  onClick={(e) => handleSmoothScroll(e, "about")}
                  className="block px-3 py-2 text-gray-700 hover:text-[#334746]"
                >
                  About
                </Link>
                <Link
                  href="#contact"
                  onClick={(e) => handleSmoothScroll(e, "contact")}
                  className="block px-3 py-2 text-gray-700 hover:text-[#334746]"
                >
                  Contact
                </Link>
                <div className="flex flex-col space-y-2 px-3 pt-4">
                  <Link href="/auth/login">
                    <Button className="w-full border border-[#334746] text-[#334746] bg-white hover:bg-[#334746] hover:text-white">
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button className="w-full bg-[#334746] text-white hover:bg-gray-800">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className={`relative overflow-hidden ${isMounted ? "opacity-100" : "opacity-0"} transition-opacity duration-700`}
      >
        <div className="absolute inset-0 w-full h-full">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/noreen.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-black/50" />
          {/* Darker overlay for better text visibility */}
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div
            className={`text-center ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} transition-all duration-700`}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Plan Your Perfect Event
            </h1>
            <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
              From intimate gatherings to grand celebrations, our comprehensive
              event coordination system helps you plan, manage, and execute
              unforgettable experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button className="bg-brand-500 hover:bg-brand-600 px-8 py-3 text-lg">
                  Start Planning <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link
                href="#features"
                onClick={(e) => handleSmoothScroll(e, "features")}
              >
                <Button className="text-white border-white border-2 bg-transparent hover:bg-white hover:text-black px-8 py-3 text-lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className={`py-24 bg-white ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} transition-all duration-700`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Plan Events
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform provides all the tools and features you need to
              create memorable events
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border border-gray-200">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-[#334746]" />
                </div>
                <CardTitle className="text-xl">Event Planning</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Comprehensive planning tools to organize every aspect of your
                  event from start to finish
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-brand-500" />
                </div>
                <CardTitle className="text-xl">Venue Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Browse and book from our curated selection of premium venues
                  for any occasion
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-brand-500" />
                </div>
                <CardTitle className="text-xl">Guest Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Easily manage guest lists, invitations, and RSVPs all in one
                  place
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-brand-500" />
                </div>
                <CardTitle className="text-xl">Premium Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Choose from carefully crafted packages or customize your own
                  perfect event
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section
        id="packages"
        className={`py-24 bg-white ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} transition-all duration-700`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Featured Packages
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover our carefully curated event packages designed to make
              your special day unforgettable
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#334746]"></div>
            </div>
          ) : packages.length > 0 ? (
            <div className="relative">
              {/* Carousel Container */}
              <div className="overflow-hidden rounded-xl">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    transform: `translateX(-${currentPackageIndex * 100}%)`,
                  }}
                >
                  {packages.map((pkg: PackageData, index: number) => (
                    <div
                      key={pkg.package_id}
                      className="w-full flex-shrink-0 px-4"
                    >
                      <Card className="mx-auto max-w-2xl bg-white border border-gray-200">
                        <div className="p-8">
                          {/* Package Header */}
                          <div className="text-center space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <Badge
                                style={{
                                  backgroundColor: "#334746",
                                  color: "white",
                                }}
                              >
                                Featured Package
                              </Badge>
                              <div className="flex items-center text-yellow-500">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className="h-4 w-4 fill-current"
                                  />
                                ))}
                              </div>
                            </div>

                            <h3 className="text-3xl font-bold text-gray-900">
                              {pkg.package_title}
                            </h3>

                            <p className="text-gray-600 text-lg leading-relaxed">
                              {pkg.package_description}
                            </p>

                            {/* Price */}
                            <div className="text-4xl font-bold text-[#334746] py-4">
                              ₱
                              {new Intl.NumberFormat("en-PH", {
                                maximumFractionDigits: 0,
                              }).format(pkg.package_price)}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                              <Button
                                className="flex-1 border-[#334746] text-[#334746] hover:bg-[#334746] hover:text-white border-2 bg-transparent"
                                onClick={() =>
                                  fetchPackageDetails(pkg.package_id)
                                }
                                disabled={isPackageLoading}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              <Link href="/auth/signup" className="flex-1">
                                <Button className="w-full bg-[#334746] hover:bg-gray-800">
                                  <Heart className="h-4 w-4 mr-2" />
                                  Book Now
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={prevPackage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors z-10"
                aria-label="Previous package"
              >
                <ChevronLeft className="h-6 w-6 text-gray-600" />
              </button>
              <button
                onClick={nextPackage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors z-10"
                aria-label="Next package"
              >
                <ChevronRight className="h-6 w-6 text-gray-600" />
              </button>

              {/* Dots Indicator */}
              <div className="flex justify-center mt-8 space-x-2">
                {packages.map((_: PackageData, index: number) => (
                  <button
                    key={index}
                    onClick={() => goToPackage(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentPackageIndex
                        ? "bg-[#334746]"
                        : "bg-gray-300 hover:bg-gray-400"
                    }`}
                    aria-label={`Go to package ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No packages available at the moment.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Gallery Section (layout only) */}
      <section
        id="gallery"
        className={`py-24 bg-gray-50 ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} transition-all duration-700`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Gallery
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A glimpse of venues and moments. Full gallery coming soon.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="services"
        className={`py-24 bg-gray-50 ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} transition-all duration-700`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We specialize in creating unforgettable experiences for every type
              of celebration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Weddings
                </h3>
                <p className="text-gray-600 mb-6">
                  Make your special day perfect with our comprehensive wedding
                  planning services
                </p>
                <ul className="text-left text-gray-600 space-y-2">
                  <li>• Venue selection and booking</li>
                  <li>• Catering and menu planning</li>
                  <li>• Photography and videography</li>
                  <li>• Floral arrangements</li>
                  <li>• Day-of coordination</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Corporate Events
                </h3>
                <p className="text-gray-600 mb-6">
                  Professional event planning for conferences, meetings, and
                  corporate celebrations
                </p>
                <ul className="text-left text-gray-600 space-y-2">
                  <li>• Conference planning</li>
                  <li>• Team building events</li>
                  <li>• Product launches</li>
                  <li>• Awards ceremonies</li>
                  <li>• Networking events</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Private Parties
                </h3>
                <p className="text-gray-600 mb-6">
                  Celebrate life's special moments with personalized party
                  planning
                </p>
                <ul className="text-left text-gray-600 space-y-2">
                  <li>• Birthday celebrations</li>
                  <li>• Anniversary parties</li>
                  <li>• Graduation parties</li>
                  <li>• Holiday celebrations</li>
                  <li>• Themed parties</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section
        id="location"
        className={`py-24 bg-white ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} transition-all duration-700`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Visit Us
            </h2>
            <p className="text-lg text-gray-600">
              Find our office and venues easily on the map below.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-xl overflow-hidden border border-gray-200 h-[320px]">
              <iframe
                title="Map"
                src="https://maps.google.com/maps?q=Manila&t=&z=12&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 h-full flex flex-col justify-center">
              <h3 className="text-2xl font-semibold text-gray-900">
                Our Location
              </h3>
              <p className="text-gray-700 mt-3">Metro Manila, Philippines</p>
              <p className="text-gray-600 mt-2">
                Open Mon–Sat, 9:00 AM – 6:00 PM
              </p>
              <div className="mt-6 flex gap-3">
                <Link href="/auth/login">
                  <Button className="border border-[#334746] text-[#334746] hover:bg-[#334746] hover:text-white">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="bg-[#334746] text-white hover:bg-gray-800">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className={`py-24 bg-brand-500 ${isMounted ? "opacity-100" : "opacity-0"} transition-opacity duration-700`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Plan Your Next Event?
          </h2>
          <p className="text-xl text-brand-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied clients who trust us with their most
            important celebrations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button className="bg-white text-brand-700 hover:bg-gray-100 px-8 py-3 text-lg">
                Get Started Today
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button className="border-white text-white hover:bg-white hover:text-brand-700 border-2 bg-transparent px-8 py-3 text-lg">
                Login to Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-brand-400 mb-4">Noreen</h3>
              <p className="text-gray-400">
                Your trusted partner in creating unforgettable events and
                celebrations.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    Wedding Planning
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Corporate Events
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Private Parties
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Venue Booking
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Our Team
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2024 EventCo. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Package Details Modal */}
      <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
        <DialogContent className="max-w-4xl h-[85vh] mx-auto fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col p-0 gap-0 bg-white rounded-lg">
          {/* Close Button */}
          <button
            onClick={() => setIsPackageModalOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Main Content Container */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header Section */}
            <div className="px-6 pt-6 pb-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-2xl font-semibold text-gray-900">
                  {selectedPackage?.package_title}
                </DialogTitle>
                <DialogDescription className="text-base text-gray-600">
                  {selectedPackage?.package_description}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6">
              {selectedPackage && (
                <div className="space-y-8 pb-6">
                  {/* Package Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center p-6 bg-brand-50 rounded-xl">
                      <div className="text-2xl sm:text-3xl font-bold text-[#334746]">
                        ₱
                        {Number(selectedPackage.package_price).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Total Package Price
                      </div>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-xl">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600">
                        {selectedPackage.guest_capacity}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Maximum Guests
                      </div>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-xl">
                      <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                        {selectedPackage.freebies
                          ? selectedPackage.freebies.length
                          : 0}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Free Items
                      </div>
                    </div>
                  </div>

                  {/* Package Inclusions */}
                  <div>
                    <h4 className="text-xl font-semibold mb-4 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      What's Included
                    </h4>
                    <div className="space-y-3">
                      {selectedPackage?.components &&
                      selectedPackage.components.length > 0 ? (
                        selectedPackage.components.map(
                          (component: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center p-4 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                              <h5 className="font-medium text-gray-900">
                                {component.component_name}
                              </h5>
                            </div>
                          )
                        )
                      ) : (
                        <div className="text-gray-500 text-center p-4">
                          No inclusions available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Freebies */}
                  {selectedPackage.freebies &&
                    selectedPackage.freebies.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold mb-4 flex items-center">
                          <Gift className="h-5 w-5 mr-2 text-orange-600" />
                          Free Bonuses
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedPackage.freebies.map(
                            (freebie: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-start p-4 bg-orange-50 rounded-lg"
                              >
                                <Gift className="h-5 w-5 mr-3 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900">
                                    {freebie.freebie_name}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {freebie.freebie_description}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Event Types */}
                  {Array.isArray(selectedPackage.event_type_names) &&
                    selectedPackage.event_type_names.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold mb-4 flex items-center">
                          <Calendar className="h-5 w-5 mr-2 text-[#334746]" />
                          Perfect for These Events
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPackage.event_type_names.map(
                            (eventType: string, idx: number) => (
                              <Badge
                                key={idx}
                                style={{
                                  backgroundColor: "#334746",
                                  opacity: 0.1,
                                  color: "#334746",
                                  padding: "0.25rem 0.75rem",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {eventType}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Available Venues */}
                  {selectedPackage.venue_previews &&
                    selectedPackage.venue_previews.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold mb-4 flex items-center">
                          <MapPin className="h-5 w-5 mr-2 text-[#334746]" />
                          Available Venues
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedPackage.venue_previews.map((venue: any) => (
                            <div
                              key={venue.venue_id}
                              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start space-x-4">
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                  <img
                                    src={
                                      getImageUrl(
                                        venue.venue_profile_picture
                                      ) || "/placeholder.jpg"
                                    }
                                    alt={venue.venue_title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900">
                                    {venue.venue_title}
                                  </h5>
                                  <p className="text-sm text-gray-600 flex items-center mt-1">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {venue.venue_location}
                                  </p>
                                  <p className="text-sm text-gray-600 flex items-center mt-1">
                                    <Users className="h-3 w-3 mr-1" />
                                    Up to {venue.venue_capacity} guests
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
