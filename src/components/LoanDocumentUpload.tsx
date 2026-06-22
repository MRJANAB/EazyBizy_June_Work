import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RequiredDocument {
  id: string;
  document_type: string;
  document_name: string;
  description: string;
  is_mandatory: boolean;
}

interface UploadedDocument {
  document_type: string;
  file: File;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

interface LoanDocumentUploadProps {
  loanTypeId: string;
  applicationId: string | null;
  userId: string;
  onComplete: () => void;
}

const LoanDocumentUpload = ({
  loanTypeId,
  applicationId,
  userId,
  onComplete,
}: LoanDocumentUploadProps) => {
  const { toast } = useToast();
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Map<string, UploadedDocument>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchRequiredDocs = async () => {
      const { data, error } = await supabase
        .from("loan_type_documents")
        .select("*")
        .eq("loan_type_id", loanTypeId);

      if (error) {
        console.error("Error fetching required documents:", error);
      } else {
        setRequiredDocs(data || []);
      }
      setLoading(false);
    };

    fetchRequiredDocs();
  }, [loanTypeId]);

  const handleFileSelect = useCallback(
    (docType: string, file: File) => {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload PDF, JPG, or PNG files only",
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Maximum file size is 5MB",
        });
        return;
      }

      setUploadedDocs((prev) => {
        const newMap = new Map(prev);
        newMap.set(docType, {
          document_type: docType,
          file,
          uploading: false,
          uploaded: false,
          error: null,
        });
        return newMap;
      });
    },
    [toast]
  );

  const uploadAllDocuments = async () => {
    if (!applicationId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Application ID is required to upload documents",
      });
      return;
    }

    setUploading(true);

    for (const [docType, docInfo] of uploadedDocs) {
      if (docInfo.uploaded) continue;

      // Update state to show uploading
      setUploadedDocs((prev) => {
        const newMap = new Map(prev);
        newMap.set(docType, { ...docInfo, uploading: true });
        return newMap;
      });

      try {
        const fileExt = docInfo.file.name.split(".").pop();
        const fileName = `${userId}/${applicationId}/${docType}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("loan-documents")
          .upload(fileName, docInfo.file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("loan-documents")
          .getPublicUrl(fileName);

        // Insert record into user_loan_documents
        const docRecord = {
          loan_application_id: applicationId,
          user_id: userId,
          document_type: docType as any,
          document_name: requiredDocs.find((d) => d.document_type === docType)?.document_name || docType,
          file_url: urlData.publicUrl,
          file_size: docInfo.file.size,
        };

        const { error: dbError } = await supabase
          .from("user_loan_documents")
          .insert(docRecord);

        if (dbError) throw dbError;

        // Update state to show success
        setUploadedDocs((prev) => {
          const newMap = new Map(prev);
          newMap.set(docType, {
            ...docInfo,
            uploading: false,
            uploaded: true,
            error: null,
          });
          return newMap;
        });
      } catch (error: any) {
        console.error("Upload error:", error);
        setUploadedDocs((prev) => {
          const newMap = new Map(prev);
          newMap.set(docType, {
            ...docInfo,
            uploading: false,
            uploaded: false,
            error: error.message,
          });
          return newMap;
        });
      }
    }

    setUploading(false);

    const allUploaded = Array.from(uploadedDocs.values()).every(
      (d) => d.uploaded
    );
    if (allUploaded) {
      toast({
        title: "Documents Uploaded",
        description: "All documents have been uploaded successfully",
      });
      onComplete();
    }
  };

  const mandatoryDocs = requiredDocs.filter((d) => d.is_mandatory);
  const optionalDocs = requiredDocs.filter((d) => !d.is_mandatory);
  const mandatoryUploaded = mandatoryDocs.every((d) =>
    uploadedDocs.has(d.document_type)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Required Documents</h3>

      {/* Mandatory Documents */}
      <div className="space-y-3">
        {mandatoryDocs.map((doc) => {
          const uploaded = uploadedDocs.get(doc.document_type);
          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border-2 border-dashed transition-colors ${
                uploaded?.uploaded
                  ? "border-green-500/50 bg-green-500/10"
                  : uploaded
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">{doc.document_name}</span>
                    <span className="text-xs text-red-500">*Required</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {doc.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {uploaded?.uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : uploaded?.uploaded ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : uploaded?.error ? (
                    <X className="h-4 w-4 text-red-500" />
                  ) : null}

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(doc.document_type, file);
                      }}
                      disabled={uploading}
                    />
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${
                        uploaded
                          ? "bg-primary/20 text-primary"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <Upload className="h-3 w-3" />
                      {uploaded ? "Change" : "Upload"}
                    </span>
                  </label>
                </div>
              </div>

              {uploaded && !uploaded.uploaded && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {uploaded.file.name}
                </p>
              )}
              {uploaded?.error && (
                <p className="text-xs text-red-500 mt-2">{uploaded.error}</p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Optional Documents */}
      {optionalDocs.length > 0 && (
        <>
          <h4 className="text-sm font-medium text-muted-foreground mt-6">
            Optional Documents
          </h4>
          <div className="space-y-3">
            {optionalDocs.map((doc) => {
              const uploaded = uploadedDocs.get(doc.document_type);
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg border transition-colors ${
                    uploaded?.uploaded
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">{doc.document_name}</span>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(doc.document_type, file);
                        }}
                        disabled={uploading}
                      />
                      <span className="text-xs text-primary hover:underline">
                        {uploaded ? "Change" : "Upload"}
                      </span>
                    </label>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Upload Button */}
      {uploadedDocs.size > 0 && applicationId && (
        <Button
          variant="hero"
          className="w-full mt-4"
          onClick={uploadAllDocuments}
          disabled={uploading || !mandatoryUploaded}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload All Documents
            </>
          )}
        </Button>
      )}

      {!mandatoryUploaded && uploadedDocs.size > 0 && (
        <p className="text-xs text-yellow-500 text-center">
          Please upload all mandatory documents to proceed
        </p>
      )}
    </div>
  );
};

export default LoanDocumentUpload;
