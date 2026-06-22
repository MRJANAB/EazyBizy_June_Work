-- Create storage bucket for profile documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-documents', 'profile-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for document uploads
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-documents' AND auth.uid()::text = (storage.foldername(name))[1]);