import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Palette, Image, Eye, Loader2 } from 'lucide-react';
import type { FormField } from '@/lib/form-types';

export interface FormStyling {
  primaryColor: string;
  backgroundColor: string;
  logoUrl: string | null;
}

interface StyleEditorProps {
  formId: number;
  formName: string;
  formDescription?: string;
  styling: FormStyling;
  onChange: (styling: FormStyling) => void;
  fields: FormField[];
}

const DEFAULT_PRIMARY_COLOR = '#3B82F6';
const DEFAULT_BACKGROUND_COLOR = '#F8FAFC';

export function StyleEditor({
  formId,
  formName,
  formDescription,
  styling,
  onChange,
  fields,
}: StyleEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);

  const handleColorChange = useCallback(
    (key: 'primaryColor' | 'backgroundColor', value: string) => {
      onChange({ ...styling, [key]: value });
    },
    [styling, onChange]
  );

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, GIF, WebP, or SVG image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadLogo(formId, file);
      onChange({ ...styling, logoUrl: result.logoUrl });
      toast({
        title: 'Logo uploaded',
        description: 'Your logo has been uploaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Clear the input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    setIsDeletingLogo(true);
    try {
      await api.deleteLogo(formId);
      onChange({ ...styling, logoUrl: null });
      toast({
        title: 'Logo removed',
        description: 'Your logo has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Failed to remove logo',
        description: error instanceof Error ? error.message : 'Failed to remove logo',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingLogo(false);
    }
  };

  const primaryColor = styling.primaryColor || DEFAULT_PRIMARY_COLOR;
  const backgroundColor = styling.backgroundColor || DEFAULT_BACKGROUND_COLOR;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Form Styling
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors" className="text-xs">
              <Palette className="w-3 h-3 mr-1" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="logo" className="text-xs">
              <Image className="w-3 h-3 mr-1" />
              Logo
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <p className="text-xs text-muted-foreground">
                Used for buttons and interactive elements
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-md border cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => document.getElementById('primary-color-input')?.click()}
                />
                <Input
                  id="primary-color-input"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="w-0 h-0 p-0 border-0 opacity-0 absolute"
                />
                <Input
                  id="primary-color"
                  type="text"
                  value={primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleColorChange('primaryColor', DEFAULT_PRIMARY_COLOR)}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="background-color">Background Color</Label>
              <p className="text-xs text-muted-foreground">
                Form background color
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-md border cursor-pointer"
                  style={{ backgroundColor: backgroundColor }}
                  onClick={() => document.getElementById('background-color-input')?.click()}
                />
                <Input
                  id="background-color-input"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                  className="w-0 h-0 p-0 border-0 opacity-0 absolute"
                />
                <Input
                  id="background-color"
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                  placeholder="#F8FAFC"
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleColorChange('backgroundColor', DEFAULT_BACKGROUND_COLOR)}
                >
                  Reset
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logo" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Form Logo</Label>
              <p className="text-xs text-muted-foreground">
                Upload a logo to display at the top of your form (max 5MB)
              </p>
            </div>

            {styling.logoUrl ? (
              <div className="space-y-3">
                <div className="relative w-full h-32 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={`http://localhost:5100${styling.logoUrl}`}
                    alt="Form logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Replace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteLogo}
                    disabled={isDeletingLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    {isDeletingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload a logo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, GIF, WebP, or SVG
                    </p>
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="space-y-2">
              <Label>Live Preview</Label>
              <p className="text-xs text-muted-foreground">
                See how your form will look to users
              </p>
            </div>
            <div
              className="mt-3 rounded-lg border overflow-hidden"
              style={{ backgroundColor }}
            >
              <div className="p-6">
                {/* Logo */}
                {styling.logoUrl && (
                  <div className="flex justify-center mb-6">
                    <img
                      src={`http://localhost:5100${styling.logoUrl}`}
                      alt="Form logo"
                      className="max-h-16 object-contain"
                    />
                  </div>
                )}

                {/* Form header */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {formName || 'Untitled Form'}
                  </h2>
                  {formDescription && (
                    <p className="mt-1 text-sm text-gray-600">{formDescription}</p>
                  )}
                </div>

                {/* Form fields preview */}
                <div className="space-y-4">
                  {fields.length > 0 ? (
                    fields.slice(0, 3).map((field) => (
                      <div key={field.id} className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          {field.label}
                          {field.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        {field.type === 'textarea' ? (
                          <div className="w-full h-20 rounded-md border border-gray-300 bg-white" />
                        ) : field.type === 'checkbox' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border border-gray-300 bg-white" />
                            <span className="text-sm text-gray-600">
                              {field.placeholder || 'Checkbox option'}
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-10 rounded-md border border-gray-300 bg-white" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Sample Field <span className="text-red-500">*</span>
                        </label>
                        <div className="w-full h-10 rounded-md border border-gray-300 bg-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Another Field
                        </label>
                        <div className="w-full h-10 rounded-md border border-gray-300 bg-white" />
                      </div>
                    </div>
                  )}
                  {fields.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{fields.length - 3} more field{fields.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Submit button */}
                <div className="mt-6">
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-md text-white font-medium transition-colors"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function parseStyling(
  primaryColor?: string | null,
  backgroundColor?: string | null,
  logoUrl?: string | null
): FormStyling {
  return {
    primaryColor: primaryColor || DEFAULT_PRIMARY_COLOR,
    backgroundColor: backgroundColor || DEFAULT_BACKGROUND_COLOR,
    logoUrl: logoUrl || null,
  };
}

export function serializeStyling(styling: FormStyling): {
  primaryColor?: string;
  backgroundColor?: string;
} {
  return {
    primaryColor: styling.primaryColor || undefined,
    backgroundColor: styling.backgroundColor || undefined,
  };
}
