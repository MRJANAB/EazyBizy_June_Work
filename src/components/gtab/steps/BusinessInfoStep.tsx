import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Building2 } from "lucide-react";

import { GTABFormData, REGISTRATION_OPTIONS, INDIAN_STATES } from "@/types/gtab";

interface BusinessInfoStepProps {
  formData: GTABFormData;
  updateFormData: (updates: Partial<GTABFormData>) => void;
}

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-3">
    <div className="bg-primary/10 p-2 rounded-xl">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

const BusinessInfoStep = ({ formData, updateFormData }: BusinessInfoStepProps) => {
  return (
    <div className="mx-auto max-w-none space-y-4 sm:space-y-8">

      <Card className="gtab-card-light rounded-[0.9rem] border shadow-sm sm:rounded-2xl">
        <CardContent className="space-y-6 p-4 sm:space-y-10 sm:p-8">

          {/* Address Section */}
          <SectionTitle
            icon={MapPin}
            title="Business Address"
            subtitle="Where is your business located?"
          />

          <div className="space-y-6">

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Address Line 1 *</Label>
              </div>
              <Input
                className="h-12 rounded-xl"
                value={formData.address_line_1}
                onChange={(e) => updateFormData({ address_line_1: e.target.value })}
                placeholder="Building No., Street Name"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Address Line 2</Label>
              </div>
              <Input
                className="h-12 rounded-xl"
                value={formData.address_line_2}
                onChange={(e) => updateFormData({ address_line_2: e.target.value })}
                placeholder="Landmark, Area (optional)"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>City *</Label>
                </div>
                <Input
                  className="h-12 rounded-xl"
                  value={formData.city}
                  onChange={(e) => updateFormData({ city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>District</Label>
                </div>
                <Input
                  className="h-12 rounded-xl"
                  value={formData.district}
                  onChange={(e) => updateFormData({ district: e.target.value })}
                  placeholder="Enter district"
                />
              </div>

              <div className="space-y-2">
                <Label>State *</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => updateFormData({ state: value })}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pincode *</Label>
                </div>
                <Input
                  className="h-12 rounded-xl"
                  value={formData.pincode}
                  onChange={(e) =>
                    updateFormData({
                      pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                  placeholder="6-digit pincode"
                  maxLength={6}
                />
              </div>

            </div>

          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Registration Section */}
          <SectionTitle
            icon={Building2}
            title="Business Registration"
            subtitle="Select your business registration details"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">

            <div className="space-y-2">
              <Label>Type of Registration *</Label>
              <Select
                value={formData.registration_type}
                onValueChange={(value: any) =>
                  updateFormData({ registration_type: value })
                }
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select registration type" />
                </SelectTrigger>
                <SelectContent>
                  {REGISTRATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Contact Section */}
          <SectionTitle
            icon={Phone}
            title="Contact Information"
            subtitle="How can we reach you?"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contact Mobile Number *</Label>
              </div>
              <Input
                className="h-12 rounded-xl"
                value={formData.contact_mobile}
                onChange={(e) =>
                  updateFormData({
                    contact_mobile: e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10),
                  })
                }
                placeholder="10-digit mobile number"
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email ID *</Label>
              </div>
              <Input
                type="email"
                className="h-12 rounded-xl"
                value={formData.contact_email}
                onChange={(e) =>
                  updateFormData({ contact_email: e.target.value })
                }
                placeholder="your@email.com"
              />
            </div>

          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessInfoStep;