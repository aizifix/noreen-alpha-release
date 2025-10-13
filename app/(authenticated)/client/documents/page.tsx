"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { endpoints } from "@/app/config/api";
import { secureStorage } from "@/app/utils/encryption";
import { protectRoute } from "@/app/utils/routeProtection";
import {
  Calendar as CalendarIcon,
  MapPin,
  File as FileIcon,
  Eye,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientEvent {
  event_id: number;
  event_title: string;
  event_date: string;
  event_type_name: string;
  venue_name: string | null;
  package_name: string | null;
  event_status: string;
}

type Attachment = {
  name: string;
  path: string;
  type?: string;
};

export default function ClientDocuments() {
  const router = useRouter();
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const userData = secureStorage.getItem("user");

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    return events.filter((event) =>
      event.event_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.event_status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredEvents.length);

  const buildFileUrl = (path?: string | null) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${path}`;
  };

  const basename = (p: string) => p.split("/").pop()?.split("\\").pop() || p;

  const normalizeAttachments = (raw: any): Attachment[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((item) => {
          if (!item) return null;
          if (typeof item === "string") {
            return { name: basename(item), path: item } as Attachment;
          }
          if (typeof item === "object") {
            const path =
              item.path ||
              item.file_path ||
              item.url ||
              item.fileUrl ||
              item.location;
            if (!path) return null;
            const name = item.name || item.file_name || basename(path);
            return {
              name,
              path,
              type: item.type || item.mime_type,
            } as Attachment;
          }
          return null;
        })
        .filter(Boolean) as Attachment[];
    }
    return [];
  };

  const fetchEvents = async () => {
    try {
      protectRoute();
      const u = secureStorage.getItem("user");
      if (!u || !u.user_id || (u.user_role || "").toLowerCase() !== "client") {
        router.push("/auth/login");
        return;
      }
      setIsLoading(true);
      const resp = await axios.get(
        `${endpoints.client}?operation=getClientEvents&user_id=${u.user_id}`
      );
      if (resp.data?.status === "success") {
        const list: ClientEvent[] = (resp.data.events || []).map((e: any) => ({
          ...e,
          venue_name: e.venue_name ?? null,
          package_name: e.package_name ?? null,
        }));
        setEvents(list);
        if (!selectedEventId && list.length > 0) {
          setSelectedEventId(list[0].event_id);
        }
      }
    } catch (err) {
      console.error("Documents: Failed to load events", err);
      setError("Failed to load your events");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttachments = async (eventId: number) => {
    try {
      const u = secureStorage.getItem("user");
      if (!u?.user_id) return;
      setIsLoadingFiles(true);
      const resp = await axios.get(
        `${endpoints.client}?operation=getClientEventDetails&user_id=${u.user_id}&event_id=${eventId}`
      );
      if (resp.data?.status === "success") {
        const raw = resp.data.event?.event_attachments;
        setAttachments(normalizeAttachments(raw));
      } else {
        setAttachments([]);
      }
    } catch (err) {
      console.error("Documents: Failed to load attachments", err);
      setAttachments([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchAttachments(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const selected = useMemo(
    () => events.find((e) => e.event_id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const getStatusBadgeClasses = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "confirmed") return "bg-green-100 text-green-700";
    if (s === "on_going") return "bg-blue-100 text-blue-700";
    if (s === "done") return "bg-purple-100 text-purple-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    if (s === "draft" || s === "planning" || s === "pending")
      return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-700";
  };

  const openInNewTab = (url: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const triggerDownload = (url: string | null, filename?: string) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    if (filename) a.download = filename;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#028A75]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events by title, venue, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300"
              />
            </div>
          </div>
        </Card>

        {filteredEvents.length === 0 ? (
          <Card className="p-12 text-center border border-gray-200">
            <FileIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? "No events match your search" : "No events found"}
            </p>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedEvents.map((ev) => {
                const isExpanded = selectedEventId === ev.event_id;
                
                return (
                  <Card key={ev.event_id} className="overflow-hidden border border-gray-200 transition-all duration-200">
                    {/* Event Header */}
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setSelectedEventId(null);
                        } else {
                          setSelectedEventId(ev.event_id);
                        }
                      }}
                      className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-6 flex-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-left">
                            {ev.event_title}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center text-gray-600">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {new Date(ev.event_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <MapPin className="h-4 w-4 mr-2" />
                              {ev.venue_name || "Venue TBD"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${getStatusBadgeClasses(ev.event_status)} capitalize`}>
                            {ev.event_status || "planning"}
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Attachments Section */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-md font-semibold text-gray-900">
                            Attachments ({attachments.length})
                          </h4>
                        </div>

                        {isLoadingFiles ? (
                          <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Skeleton key={i} className="h-20 w-full" />
                            ))}
                          </div>
                        ) : (
                          <>
                            {attachments.length > 0 ? (
                              <div className="space-y-3">
                                {attachments.map((file, idx) => {
                                  const url = buildFileUrl(file.path);
                                  return (
                                    <Card key={`${file.name}-${idx}`} className="p-4 bg-white border border-gray-200">
                                      <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                          <div className="flex-shrink-0 w-10 h-10 bg-[#028A75]/10 rounded-lg flex items-center justify-center">
                                            <FileIcon className="h-5 w-5 text-[#028A75]" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                              {file.name}
                                            </p>
                                            <p className="text-sm text-gray-500 truncate">
                                              {file.type || "Document"}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openInNewTab(url)}
                                            className="border-[#028A75] text-[#028A75] hover:bg-[#028A75]/10"
                                          >
                                            <Eye className="h-4 w-4 mr-1.5" />
                                            View
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => triggerDownload(url, file.name)}
                                            className="bg-[#028A75] hover:bg-[#028A75]/90 text-white"
                                          >
                                            <Download className="h-4 w-4 mr-1.5" />
                                            Download
                                          </Button>
                                        </div>
                                      </div>
                                    </Card>
                                  );
                                })}
                              </div>
                            ) : (
                              <Card className="p-8 text-center bg-white border border-gray-200">
                                <FileIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">No attachments available</p>
                              </Card>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#028A75] focus:border-transparent"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-600">
                      entries (showing {startItem}-{endItem} of {filteredEvents.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="disabled:opacity-50"
                    >
                      <ChevronDown className="h-4 w-4 rotate-90" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={page === currentPage ? "bg-[#028A75] hover:bg-[#028A75]/90 text-white" : ""}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="disabled:opacity-50"
                    >
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
