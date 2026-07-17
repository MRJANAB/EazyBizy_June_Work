import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, FolderOpen } from "lucide-react";

interface DocRecord {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size: number | null;
  status: string;
  created_at: string;
}

const STORAGE_BUCKET = "loan-documents";

// Derive the storage object path from the stored (public-style) URL so we can
// mint a short-lived signed URL — the bucket is private, so a plain URL 404s.
const pathFromUrl = (url: string): string | null => {
  const marker = `/${STORAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? url.substring(i + marker.length).split("?")[0] : null;
};

const prettyType = (t: string) =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtSize = (b: number | null) =>
  !b ? "" : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

const statusStyle = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "verified") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  if (v === "rejected") return "text-rose-400 bg-rose-500/10 border-rose-500/30";
  if (v === "reupload_required") return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  return "text-slate-300 bg-slate-500/10 border-slate-500/30"; // pending
};

/**
 * Read-only documents panel for the Credit Analyst. Lists every document the
 * applicant uploaded for this application and lets the analyst securely
 * download each one (short-lived signed URL). View & download only.
 */
export const ApplicationDocuments = ({ applicationId }: { applicationId: string }) => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_loan_documents")
        .select("id, document_type, document_name, file_url, file_size, status, created_at")
        .eq("loan_application_id", applicationId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("Load documents error:", error);
        toast({ variant: "destructive", title: "Could not load documents", description: error.message });
        setDocs([]);
      } else {
        setDocs((data as DocRecord[]) || []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [applicationId, toast]);

  const download = useCallback(async (doc: DocRecord) => {
    setDownloadingId(doc.id);
    try {
      const path = pathFromUrl(doc.file_url);
      let href = doc.file_url;
      if (path) {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(path, 120); // valid 2 minutes
        if (error) throw error;
        href = data.signedUrl;
      }
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error("Download error:", e);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: e.message || "You may not have permission — ensure the document-access policy is applied.",
      });
    } finally {
      setDownloadingId(null);
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
        <span className="font-black uppercase tracking-widest text-teal-500/80">
          Uploaded Documents ({docs.length})
        </span>
        <span className="text-slate-400">{verified} verified</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-400">{pending} pending</span>
        {rejected > 0 && <><span className="text-slate-400">·</span><span className="text-rose-400">{rejected} rejected</span></>}
      </div>

      <div className="space-y-2">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-teal-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{doc.document_name || prettyType(doc.document_type)}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {prettyType(doc.document_type)}
                  {doc.file_size ? ` · ${fmtSize(doc.file_size)}` : ""}
                  {doc.created_at ? ` · ${new Date(doc.created_at).toLocaleDateString()}` : ""}
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
                disabled={downloadingId === doc.id}
              >
                {downloadingId === doc.id ? (
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
