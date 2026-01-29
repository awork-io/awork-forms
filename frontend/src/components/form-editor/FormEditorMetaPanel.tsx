import type { ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputField, TextareaField } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';

interface FormEditorMetaPanelProps {
  formName: string;
  formDescription: string;
  isActive: boolean;
  onFormNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFormDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onActiveChange: (value: boolean) => void;
  nameTranslations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
  onNameTranslationChange: (language: string, value: string) => void;
  onDescriptionTranslationChange: (language: string, value: string) => void;
  defaultTranslationLanguage: string;
}

export function FormEditorMetaPanel({
  formName,
  formDescription,
  isActive,
  onFormNameChange,
  onFormDescriptionChange,
  onActiveChange,
  nameTranslations,
  descriptionTranslations,
  onNameTranslationChange,
  onDescriptionTranslationChange,
  defaultTranslationLanguage,
}: FormEditorMetaPanelProps) {
  const { t } = useTranslation();
  const translationLanguages = [
    { code: 'de', label: t('language.german') },
    { code: 'en', label: t('language.english') },
  ];

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{t('formEditor.formSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InputField
            label={t('formEditor.formName')}
            id="form-name"
            value={formName}
            onChange={onFormNameChange}
            placeholder={t('formEditor.formNamePlaceholder')}
          />
          <TextareaField
            label={t('formEditor.descriptionLabel')}
            id="form-description"
            value={formDescription}
            onChange={onFormDescriptionChange}
            placeholder={t('formEditor.descriptionPlaceholder')}
            rows={2}
          />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('formEditor.formStatus')}</Label>
              <p className="text-sm text-muted-foreground">
                {isActive ? t('formEditor.formStatusActive') : t('formEditor.formStatusInactive')}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={onActiveChange} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{t('formEditor.translations.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('formEditor.translations.description')}</p>
          <Tabs defaultValue={defaultTranslationLanguage} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {translationLanguages.map((language) => (
                <TabsTrigger key={language.code} value={language.code} className="text-xs">
                  {language.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {translationLanguages.map((language) => (
              <TabsContent key={language.code} value={language.code} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <InputField
                    label={t('formEditor.translations.formName')}
                    value={nameTranslations[language.code] || ''}
                    onChange={(event) => onNameTranslationChange(language.code, event.target.value)}
                    placeholder={formName || t('formEditor.formNamePlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground pl-2">{t('formEditor.translations.fallbackHint')}</p>
                </div>
                <TextareaField
                  label={t('formEditor.translations.formDescription')}
                  value={descriptionTranslations[language.code] || ''}
                  onChange={(event) => onDescriptionTranslationChange(language.code, event.target.value)}
                  placeholder={formDescription || t('formEditor.descriptionPlaceholder')}
                  rows={2}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
