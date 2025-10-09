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
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | undefined>(undefined);

  const userData = secureStorage.getItem("user");

  const filteredAttachments = useMemo(() => {
    if (!query) return attachments;
    return attachments.filter((a) =>
      a.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [attachments, query]);

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
          const firstId = list[0].event_id;
          setSelectedEventId(firstId);
          setExpanded(`event-${firstId}`);
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
    <div>
      <div className="animate-docs-fade-in">
        <div className="flex items-center mb-0">
          <h1 className="text-2xl font-bold">Documents</h1>
        </div>

        <Card className="p-4 sm:p-6 bg-white">
          <div className="flex items-center mb-4">
            <h2 className="text-lg font-semibold">Events</h2>
          </div>

          <Accordion
            type="single"
            collapsible
            className="w-full"
            value={expanded}
            onValueChange={(v: string) => {
              setExpanded(v || undefined);
              if (v && v.startsWith("event-")) {
                const idStr = v.replace("event-", "");
                const idNum = Number(idStr);
                if (!Number.isNaN(idNum)) setSelectedEventId(idNum);
              }
            }}
          >
            {events.map((ev) => (
              <AccordionItem key={ev.event_id} value={`event-${ev.event_id}`}>
                <AccordionTrigger>
                  <div className="w-full pr-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold truncate">
                        {ev.event_title}
                      </span>
                      <Badge
                        className={`${getStatusBadgeClasses(ev.event_status)} capitalize`}
                      >
                        {ev.event_status || "planning"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                        {new Date(ev.event_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        <span className="truncate max-w-[220px]">
                          {ev.venue_name || "Venue TBD"}
                        </span>
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {isLoadingFiles && selectedEventId === ev.event_id ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#028A75]"></div>
                      </div>
                    ) : selectedEventId === ev.event_id ? (
                      <Card>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-1/2">File name</TableHead>
                              <TableHead className="w-1/4">Type</TableHead>
                              <TableHead className="w-1/4 text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAttachments.length > 0 ? (
                              filteredAttachments.map((file, idx) => {
                                const url = buildFileUrl(file.path);
                                return (
                                  <TableRow key={`${file.name}-${idx}`}>
                                    <TableCell>
                                      <div className="flex items-center gap-3 min-w-0">
                                        <FileIcon className="h-4 w-4 text-[#028A75] flex-shrink-0" />
                                        <span className="truncate">
                                          {file.name}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-xs text-gray-600 truncate">
                                        {file.type || file.path}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          onClick={() => openInNewTab(url)}
                                          className="h-8 px-3 border-[#028A75] text-[#028A75] hover:bg-[#028A75]/10"
                                        >
                                          <Eye className="h-3.5 w-3.5 mr-1.5" />{" "}
                                          View
                                        </Button>
                                        <Button
                                          onClick={() =>
                                            triggerDownload(url, file.name)
                                          }
                                          className="h-8 px-3 bg-[#028A75] hover:bg-[#028A75]/90 text-white"
                                        >
                                          <Download className="h-3.5 w-3.5 mr-1.5" />{" "}
                                          Download
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={3}
                                  className="text-center text-gray-500"
                                >
                                  No files found
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </Card>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        {/* Files per event are shown inside the accordion items above */}

        <style jsx>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @keyframes docs-fade-in {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes docs-slide-up {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-docs-fade-in {
            animation: docs-fade-in 0.5s ease-out both;
          }
          .animate-docs-slide-up {
            animation: docs-slide-up 0.35s ease-out both;
          }
        `}</style>
      </div>
    </div>
  );
}
