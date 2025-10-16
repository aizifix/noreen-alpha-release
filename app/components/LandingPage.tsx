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
  Sparkles,
  Award,
  Clock,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Twitter,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link
                href="/"
                className="text-2xl font-bold text-[#334746] group"
              >
                <Image
                  src={Logo}
                  alt="Noreen Logo"
                  width={120}
                  height={120}
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                {[
                  { href: "#features", label: "Features" },
                  { href: "#services", label: "Services" },
                  { href: "#gallery", label: "Gallery" },
                  { href: "#location", label: "Location" },
                  { href: "#about", label: "About" },
                  { href: "#contact", label: "Contact" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) =>
                      handleSmoothScroll(e, item.href.replace("#", ""))
                    }
                    className="relative text-gray-700 hover:text-[#334746] transition-all duration-300 font-medium group"
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#334746] transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  className="border-[#334746] text-[#334746] hover:bg-[#334746] hover:text-white bg-white transition-all duration-300 hover:shadow-md"
                >
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-[#334746] to-[#2a3a3a] hover:from-[#2a3a3a] hover:to-[#334746] text-white shadow-lg hover:shadow-xl transition-all duration-300">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-gray-100 transition-colors"
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
            <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md">
              <div className="px-2 pt-4 pb-6 space-y-2 sm:px-3">
                {[
                  { href: "#features", label: "Features" },
                  { href: "#services", label: "Services" },
                  { href: "#gallery", label: "Gallery" },
                  { href: "#location", label: "Location" },
                  { href: "#about", label: "About" },
                  { href: "#contact", label: "Contact" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) =>
                      handleSmoothScroll(e, item.href.replace("#", ""))
                    }
                    className="block px-4 py-3 text-gray-700 hover:text-[#334746] hover:bg-gray-50 rounded-lg transition-all duration-200 font-medium"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="flex flex-col space-y-3 px-4 pt-4 border-t border-gray-100">
                  <Link href="/auth/login">
                    <Button
                      variant="outline"
                      className="w-full border-[#334746] text-[#334746] bg-white hover:bg-[#334746] hover:text-white transition-all duration-300"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button className="w-full bg-gradient-to-r from-[#334746] to-[#2a3a3a] text-white hover:from-[#2a3a3a] hover:to-[#334746] transition-all duration-300">
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
        className={`relative overflow-hidden min-h-screen flex items-center ${isMounted ? "opacity-100" : "opacity-0"} transition-opacity duration-700`}
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
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-32 h-32 bg-[#334746]/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-40 left-1/4 w-16 h-16 bg-white/5 rounded-full blur-lg animate-pulse delay-2000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div
            className={`text-center ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} transition-all duration-1000 delay-200`}
          >
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4 mr-2" />
              Trusted by 1000+ Event Planners
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight">
              Plan Your
              <span className="block bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Perfect Event
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-4xl mx-auto leading-relaxed">
              From intimate gatherings to grand celebrations, our comprehensive
              event coordination system helps you plan, manage, and execute
              unforgettable experiences with ease.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-[#334746] to-[#2a3a3a] hover:from-[#2a3a3a] hover:to-[#334746] text-white px-10 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  Start Planning <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link
                href="#features"
                onClick={(e) => handleSmoothScroll(e, "features")}
              >
                <Button className="text-white border-2 border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white hover:text-[#334746] px-10 py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  1000+
                </div>
                <div className="text-gray-300">Events Planned</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  50+
                </div>
                <div className="text-gray-300">Premium Venues</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  24/7
                </div>
                <div className="text-gray-300">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className={`py-32 bg-gradient-to-br from-white to-gray-50 ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} transition-all duration-1000`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#334746]/10 text-[#334746] text-sm font-medium mb-6">
              <Award className="w-4 h-4 mr-2" />
              Why Choose Us
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to
              <span className="block bg-gradient-to-r from-[#334746] to-[#2a3a3a] bg-clip-text text-transparent">
                Plan Perfect Events
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Our comprehensive platform provides all the tools and features you
              need to create memorable events that exceed expectations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Calendar,
                title: "Event Planning",
                description:
                  "Comprehensive planning tools to organize every aspect of your event from start to finish",
                color: "from-blue-500 to-blue-600",
                bgColor: "bg-blue-50",
                iconColor: "text-blue-600",
              },
              {
                icon: MapPin,
                title: "Venue Management",
                description:
                  "Browse and book from our curated selection of premium venues for any occasion",
                color: "from-green-500 to-green-600",
                bgColor: "bg-green-50",
                iconColor: "text-green-600",
              },
              {
                icon: Users,
                title: "Guest Management",
                description:
                  "Easily manage guest lists, invitations, and RSVPs all in one place",
                color: "from-purple-500 to-purple-600",
                bgColor: "bg-purple-50",
                iconColor: "text-purple-600",
              },
              {
                icon: Star,
                title: "Premium Packages",
                description:
                  "Choose from carefully crafted packages or customize your own perfect event",
                color: "from-orange-500 to-orange-600",
                bgColor: "bg-orange-50",
                iconColor: "text-orange-600",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white/80 backdrop-blur-sm"
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-20 h-20 ${feature.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon
                      className={`h-10 w-10 ${feature.iconColor}`}
                    />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-[#334746] transition-colors duration-300">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-center text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section
        id="packages"
        className={`py-32 bg-gradient-to-br from-gray-50 to-white ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} transition-all duration-1000`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#334746]/10 text-[#334746] text-sm font-medium mb-6">
              <Package className="w-4 h-4 mr-2" />
              Featured Packages
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Our Carefully Curated
              <span className="block bg-gradient-to-r from-[#334746] to-[#2a3a3a] bg-clip-text text-transparent">
                Event Packages
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Discover our carefully curated event packages designed to make
              your special day unforgettable with premium venues and services
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#334746] border-t-transparent absolute top-0 left-0"></div>
              </div>
            </div>
          ) : packages.length > 0 ? (
            <div className="relative">
              {/* Carousel Container */}
              <div className="overflow-hidden rounded-3xl shadow-2xl">
                <div
                  className="flex transition-transform duration-700 ease-in-out"
                  style={{
                    transform: `translateX(-${currentPackageIndex * 100}%)`,
                  }}
                >
                  {packages.map((pkg: PackageData, index: number) => (
                    <div
                      key={pkg.package_id}
                      className="w-full flex-shrink-0 px-4"
                    >
                      <div className="mx-auto max-w-4xl bg-white rounded-xl border border-gray-200 p-8">
                        {/* Package Header */}
                        <div className="text-center mb-8">
                          <div className="flex items-center justify-center mb-4">
                            <Badge className="bg-[#334746] text-white px-4 py-2 text-sm font-medium">
                              <Sparkles className="w-4 h-4 mr-2" />
                              Featured Package
                            </Badge>
                          </div>
                          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            {pkg.package_title}
                          </h3>
                          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                            {pkg.package_description}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="text-center mb-8">
                          <div className="text-5xl md:text-6xl font-bold text-[#334746] mb-2">
                            ₱
                            {new Intl.NumberFormat("en-PH", {
                              maximumFractionDigits: 0,
                            }).format(pkg.package_price)}
                          </div>
                          <div className="text-gray-500 text-lg">
                            Starting Price
                          </div>
                        </div>

                        {/* Package Stats */}
                        <div className="grid grid-cols-3 gap-6 mb-8 py-6 border-y border-gray-200">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[#334746]">
                              {pkg.guest_capacity}
                            </div>
                            <div className="text-sm text-gray-600">
                              Max Guests
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[#334746]">
                              {pkg.component_count}
                            </div>
                            <div className="text-sm text-gray-600">
                              Components
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[#334746]">
                              {pkg.venue_count}
                            </div>
                            <div className="text-sm text-gray-600">Venues</div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Button
                            className="flex-1 border border-[#334746] text-[#334746] hover:bg-[#334746] hover:text-white bg-transparent px-6 py-3 text-lg font-medium transition-all duration-300"
                            onClick={() => fetchPackageDetails(pkg.package_id)}
                            disabled={isPackageLoading}
                          >
                            <Eye className="h-5 w-5 mr-2" />
                            View Details
                          </Button>
                          <Link href="/auth/signup" className="flex-1">
                            <Button className="w-full bg-[#334746] hover:bg-gray-800 text-white px-6 py-3 text-lg font-medium transition-all duration-300">
                              <Heart className="h-5 w-5 mr-2" />
                              Book Now
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={prevPackage}
                className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm shadow-xl rounded-full p-4 hover:bg-white hover:shadow-2xl transition-all duration-300 z-10 group"
                aria-label="Previous package"
              >
                <ChevronLeft className="h-6 w-6 text-gray-600 group-hover:text-[#334746] transition-colors" />
              </button>
              <button
                onClick={nextPackage}
                className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm shadow-xl rounded-full p-4 hover:bg-white hover:shadow-2xl transition-all duration-300 z-10 group"
                aria-label="Next package"
              >
                <ChevronRight className="h-6 w-6 text-gray-600 group-hover:text-[#334746] transition-colors" />
              </button>

              {/* Dots Indicator */}
              <div className="flex justify-center mt-12 space-x-3">
                {packages.map((_: PackageData, index: number) => (
                  <button
                    key={`landing-package-dot-${index}`}
                    onClick={() => goToPackage(index)}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      index === currentPackageIndex
                        ? "bg-[#334746] scale-125"
                        : "bg-gray-300 hover:bg-gray-400 hover:scale-110"
                    }`}
                    aria-label={`Go to package ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                No Packages Available
              </h3>
              <p className="text-gray-500 text-lg">
                We're working on adding amazing packages for you. Check back
                soon!
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
        className={`py-32 bg-gradient-to-br from-white to-gray-50 ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} transition-all duration-1000`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#334746]/10 text-[#334746] text-sm font-medium mb-6">
              <Award className="w-4 h-4 mr-2" />
              Our Services
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              We Specialize in Creating
              <span className="block bg-gradient-to-r from-[#334746] to-[#2a3a3a] bg-clip-text text-transparent">
                Unforgettable Experiences
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              From intimate gatherings to grand celebrations, we bring expertise
              and passion to every type of event
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Weddings",
                description:
                  "Make your special day perfect with our comprehensive wedding planning services",
                icon: Heart,
                color: "from-pink-500 to-rose-600",
                bgColor: "bg-pink-50",
                iconColor: "text-pink-600",
                features: [
                  "Venue selection and booking",
                  "Catering and menu planning",
                  "Photography and videography",
                  "Floral arrangements",
                  "Day-of coordination",
                ],
              },
              {
                title: "Corporate Events",
                description:
                  "Professional event planning for conferences, meetings, and corporate celebrations",
                icon: Users,
                color: "from-blue-500 to-indigo-600",
                bgColor: "bg-blue-50",
                iconColor: "text-blue-600",
                features: [
                  "Conference planning",
                  "Team building events",
                  "Product launches",
                  "Awards ceremonies",
                  "Networking events",
                ],
              },
              {
                title: "Private Parties",
                description:
                  "Celebrate life's special moments with personalized party planning",
                icon: Gift,
                color: "from-purple-500 to-violet-600",
                bgColor: "bg-purple-50",
                iconColor: "text-purple-600",
                features: [
                  "Birthday celebrations",
                  "Anniversary parties",
                  "Graduation parties",
                  "Holiday celebrations",
                  "Themed parties",
                ],
              },
            ].map((service, index) => (
              <div key={index} className="group">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 h-full">
                  <div className="text-center mb-8">
                    <div
                      className={`w-20 h-20 ${service.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <service.icon
                        className={`h-10 w-10 ${service.iconColor}`}
                      />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-[#334746] transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed mb-8">
                      {service.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      What's Included:
                    </h4>
                    <ul className="space-y-3">
                      {service.features.map((feature, featureIndex) => (
                        <li
                          key={featureIndex}
                          className="flex items-start text-gray-600"
                        >
                          <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <Link href="/auth/signup">
                      <Button className="w-full bg-gradient-to-r from-[#334746] to-[#2a3a3a] hover:from-[#2a3a3a] hover:to-[#334746] text-white py-3 font-semibold transition-all duration-300 transform hover:scale-105">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
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
      <footer className="bg-gradient-to-br from-gray-900 via-[#334746] to-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-6">
                <Image
                  src={Logo}
                  alt="Noreen Logo"
                  width={60}
                  height={60}
                  className="mr-3"
                />
                <h3 className="text-2xl font-bold text-white">Noreen</h3>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6">
                Your trusted partner in creating unforgettable events and
                celebrations. We bring your vision to life with passion and
                precision.
              </p>
              <div className="flex space-x-4">
                <Link
                  href="#"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </Link>
                <Link
                  href="#"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </Link>
                <Link
                  href="#"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Services</h4>
              <ul className="space-y-3">
                {[
                  "Wedding Planning",
                  "Corporate Events",
                  "Private Parties",
                  "Venue Booking",
                  "Event Coordination",
                ].map((service, index) => (
                  <li key={index}>
                    <Link
                      href="#"
                      className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center group"
                    >
                      <ArrowRight className="h-4 w-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {service}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Company</h4>
              <ul className="space-y-3">
                {["About Us", "Our Team", "Careers", "Contact", "Blog"].map(
                  (item, index) => (
                    <li key={index}>
                      <Link
                        href="#"
                        className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center group"
                      >
                        <ArrowRight className="h-4 w-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {item}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">
                Get In Touch
              </h4>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-[#334746] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-gray-300">+63 123 456 7890</p>
                    <p className="text-sm text-gray-400">
                      Mon - Sat, 9AM - 6PM
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-[#334746] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-gray-300">info@noreen.com</p>
                    <p className="text-sm text-gray-400">
                      We'll respond within 24h
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-[#334746] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-gray-300">Metro Manila</p>
                    <p className="text-sm text-gray-400">Philippines</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-gray-400 text-center md:text-left">
                <p>&copy; 2024 Noreen Events. All rights reserved.</p>
                <p className="text-sm mt-1">
                  Crafting memories, one event at a time.
                </p>
              </div>
              <div className="flex space-x-6 text-sm">
                <Link
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Cookie Policy
                </Link>
              </div>
            </div>
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
                              key={`landing-component-${idx}`}
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
                                key={`landing-freebie-${idx}`}
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
                                key={`landing-event-type-${idx}`}
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
