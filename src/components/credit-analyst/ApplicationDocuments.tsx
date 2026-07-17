import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, FolderOpen } from "lucide-react";

interface DocItem {
  key: string;
  documentType: string;
  documentName: string;
  fileUrl: string;
  status: string;
  uploadedAt: string | null;
}

const STORAGE_BUCKETS = ["loan-documents", "profile-documents"] as const;

// A stored file reference can be either "bucket:path" or a full public/sign URL.
// Resolve it to { bucket, path } so we can mint a short-lived signed URL — the
// buckets are private, so a plain URL won't download.
const parseRef = (fileUrl: string): { bucket: string; path: string } | null => {
  for (const b of STORAGE_BUCKETS) {
    if (fileUrl.startsWith(`${b}:`)) return { bucket: b, path: fileUrl.slice(b.length + 1) };
  }
  try {
    const u = new URL(fileUrl);
    for (const b of STORAGE_BUCKETS) {
      for (const marker of [`/storage/v1/object/public/${b}/`, `/storage/v1/object/sign/${b}/`]) {
        const i = u.pathname.indexOf(marker);
        if (i !== -1) return { bucket: b, path: decodeURIComponent(u.pathname.slice(i + marker.length)) };
      }
    }
  } catch { /* not a URL */ }
  return null;
};

const prettyType = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const statusStyle = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "verified") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  if (v === "rejected") return "text-rose-400 bg-rose-500/10 border-rose-500/30";
  if (v === "reupload_required") return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  return "text-slate-300 bg-slate-500/10 border-slate-500/30";
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Read-only documents panel for the Credit Analyst. Reads the documents the
 * applicant uploaded — from project_report_inputs.uploaded_documents (the JSON
 * store this deployment uses) and, if present, the user_loan_documents table —
 * and lets the analyst securely download each one (short-lived signed URL).
 * View & download only.
 */
export const ApplicationDocuments = ({ applicationId }: { applicationId: string }) => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const byType = new Map<string, DocItem>();

      // 1) Table records (only if the table exists in this deployment).
      try {
        const { data, error } = await supabase
          .from("user_loan_documents")
          .select("id, document_type, document_name, file_url, status, created_at")
          .eq("loan_application_id", applicationId);
        if (!error && data) {
          for (const r of data as any[]) {
            byType.set(r.document_type, {
              key: r.id,
              documentType: r.document_type,
              documentName: r.document_name || prettyType(r.document_type),
              fileUrl: r.file_url,
              status: r.status || "pending",
              uploadedAt: r.created_at || null,
            });
          }
        }
      } catch { /* table missing — JSON fallback below */ }

      // 2) JSON store on the application (this deployment's primary source).
      const { data: app, error: appErr } = await supabase
        .from("loan_applications")
        .select("project_report_inputs, updated_at, created_at")
        .eq("id", applicationId)
        .maybeSingle();

      if (!appErr && app) {
        const pri = (app as any).project_report_inputs;
        const uploaded = isRecord(pri) && isRecord(pri.uploaded_documents) ? pri.uploaded_documents : {};
        for (const [docType, value] of Object.entries(uploaded)) {
          if (!isRecord(value)) continue;
          const fileUrl = typeof value.file_url === "string" ? value.file_url : null;
          if (!fileUrl) continue;
          if (byType.has(docType)) continue; // prefer the table record if both exist
          byType.set(docType, {
            key: `${applicationId}:${docType}`,
            documentType: docType,
            documentName: typeof value.document_name === "string" ? value.document_name : prettyType(docType),
            fileUrl,
            status: typeof value.status === "string" ? value.status : "pending",
            uploadedAt: typeof value.uploaded_at === "string" ? value.uploaded_at : ((app as any).updated_at || (app as any).created_at || null),
          });
        }
      }

      if (cancelled) return;
      if (appErr) {
        console.error("Load documents error:", appErr);
        toast({ variant: "destructive", title: "Could not load documents", description: appErr.message });
      }
      setDocs(Array.from(byType.values()));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [applicationId, toast]);

  const download = useCallback(async (doc: DocItem) => {
    setDownloadingKey(doc.key);
    try {
      const ref = parseRef(doc.fileUrl);
      let href = doc.fileUrl;
      if (ref) {
        const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, 120);
        if (error) throw error;
        href = data.signedUrl;
      }
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error("Download error:", e);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: e.message || "You may not have permission — ensure the document-storage read policy is applied.",
      });
    } finally {
      setDownloadingKey(null);
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading documents…
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="h-10 w-10 text-slate-600 mb-3" />
        <p className="text-slate-400 font-semibold">No documents uploaded yet</p>
        <p className="text-slate-600 text-xs mt-1">
          The applicant hasn't uploaded any supporting documents for this application.
        </p>
      </div>
    );
  }

  const verified = docs.filter((d) => d.status?.toLowerCase() === "verified").length;
  const rejected = docs.filter((d) => d.status?.toLowerCase() === "rejected").length;
  const pending = docs.length - verified - rejected;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-black uppercase tracking-widest text-teal-500/80">Uploaded Documents ({docs.length})</span>
        <span className="text-slate-400">{verified} verified</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-400">{pending} pending</span>
        {rejected > 0 && <><span className="text-slate-400">·</span><span className="text-rose-400">{rejected} rejected</span></>}
      </div>

      <div className="space-y-2">
        {docs.map((doc) => (
          <div key={doc.key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-teal-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{doc.documentName}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {prettyType(doc.documentType)}
                  {doc.uploadedAt ? ` · ${new Date(doc.uploadedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${statusStyle(doc.status)}`}>
                {(doc.status || "pending").replace(/_/g, " ")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 text-slate-200 text-xs"
                onClick={() => download(doc)}
                disabled={downloadingKey === doc.key}
              >
                {downloadingKey === doc.key ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <><Download className="h-3.5 w-3.5 mr-1" /> Download</>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApplicationDocuments;
