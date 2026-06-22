import { useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      setIsSuccess(true);
      toast({
        title: "Email sent!",
        description: "Check your inbox for password reset instructions.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shadow">
            <img src="/logo.png" alt="EazyBizy" className="w-full h-full object-contain" />
          </div>
          <span className="text-2xl font-bold text-foreground">
            Eazy<span className="text-gradient-primary">Bizy</span>
          </span>
        </div>

        {isSuccess ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent password reset instructions to your email address.
            </p>
            <Button variant="outline" asChild>
              <Link to="/auth">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-foreground mb-2">Forgot password?</h1>
            <p className="text-muted-foreground mb-8">
              Enter your email and we'll send you reset instructions.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="name@example.com"
                            className="pl-10 glass-card border-border"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </Form>

            <p className="text-center text-muted-foreground mt-6">
              Remember your password?{" "}
              <Link to="/auth" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
