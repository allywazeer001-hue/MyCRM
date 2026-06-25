"use client";
import { useEffect, useState, useRef } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import { portalApi } from "@/lib/portal-api";
import { PortalFieldRenderer, PortalFieldDef } from "@/components/portal/portal-field-renderer";
import { Loader2, FileText, Database, Save, Edit2, X, Upload, Trash2, FileIcon, ChevronDown, ChevronRight } from "lucide-react";

interface CrmField { id: string; name: string; label: string; type: string; options?: any[] }
interface CrmRecord { id: string; data: Record<string, any>; createdAt: string }
interface RecordData {
  record: CrmRecord | null;
  module: { id: string; name: string; icon?: string } | null;
  fields: CrmField[];
}

interface PortalFieldWithValue extends PortalFieldDef { value: any }
interface PortalSection { id: string; label: string; type: string; icon?: string; isCollapsible: boolean; fields: PortalFieldWithValue[] }
interface PortalFieldsData { sections: PortalSection[]; orphanFields: PortalFieldWithValue[] }

interface PortalDocument { id: string; originalName: string; fileName: string; fileSize: number; mimeType: string; createdAt: string }

function CrmFieldValue({ field, value }: { field: CrmField; value: any }) {
  if (value == null || value === "") return <span className="text-gray-400 italic text-sm">Not set</span>;
  if (field.type === "CHECKBOX") return <span className={`text-sm font-medium ${value ? "text-green-600" : "text-gray-400"}`}>{value ? "Yes" : "No"}</span>;
  if (field.type === "SELECT" || field.type === "RADIO") {
    const opt = field.options?.find((o: any) => o.value === value);
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{opt?.label ?? value}</span>;
  }
  if (field.type === "DATE" && value) return <span className="text-sm text-gray-800">{new Date(value).toLocaleDateString()}</span>;
  if (field.type === "TEXTAREA") return <p className="text-sm text-gray-800 whitespace-pre-wrap">{value}</p>;
  return <span className="text-sm text-gray-800">{String(value)}</span>;
}

function SectionBlock({ section, onSave }: { section: PortalSection; onSave: (fieldKey: string, value: any) => void }) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, any>>(() => Object.fromEntries(section.fields.map(f => [f.fieldKey, f.value])));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(Object.fromEntries(section.fields.map(f => [f.fieldKey, f.value])));
  }, [section]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave("__section__", values);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const editableFields = section.fields.filter(f => f.isEditable && !f.isReadOnly);
  const hasEditable = editableFields.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
        <button onClick={() => section.isCollapsible && setOpen(o => !o)} className="flex items-center gap-2 flex-1">
          {section.icon && <span className="text-base">{section.icon}</span>}
          <h2 className="text-sm font-semibold text-gray-800 truncate">{section.label}</h2>
          {section.isCollapsible && (open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />)}
        </button>
        {hasEditable && !editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50">
            <Edit2 className="w-3 h-3" />Edit
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-1">
            <button onClick={() => { setEditing(false); setValues(Object.fromEntries(section.fields.map(f => [f.fieldKey, f.value]))); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"><X className="w-3.5 h-3.5" /></button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save
            </button>
          </div>
        )}
      </div>
      {open && (
        <div className="divide-y divide-gray-50">
          {section.fields.map(field => (
            <div key={field.id} className="px-5 py-3.5 flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
              <div className="w-full sm:w-44 shrink-0">
                <p className="text-sm font-medium text-gray-600">{field.label}</p>
                {field.isReadOnly && <span className="text-xs text-amber-500">read-only</span>}
              </div>
              <div className="flex-1 w-full min-w-0">
                {field.helpText && <p className="text-xs text-gray-400 mb-1">{field.helpText}</p>}
                <PortalFieldRenderer
                  field={field}
                  value={editing ? values[field.fieldKey] : field.value}
                  onChange={v => setValues(prev => ({ ...prev, [field.fieldKey]: v }))}
                  readOnly={!editing}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PortalRecordsPage() {
  const [crmData, setCrmData] = useState<RecordData | null>(null);
  const [portalFields, setPortalFields] = useState<PortalFieldsData | null>(null);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      portalApi.get("/portal/record").then(r => setCrmData(r.data)).catch(() => {}),
      portalApi.get("/portal/fields").then(r => setPortalFields(r.data)).catch(() => {}),
      portalApi.get("/portal/documents").then(r => setDocuments(r.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const savePortalValues = async (_: string, values: Record<string, any>) => {
    const updates = Object.entries(values).map(([fieldKey, value]) => ({ fieldKey, value }));
    const { data } = await portalApi.patch("/portal/fields", { updates });
    if (portalFields) {
      const updatedMap: Record<string, any> = {};
      data.updated?.forEach((u: any) => { updatedMap[u.fieldKey] = u.value; });
      setPortalFields(prev => {
        if (!prev) return prev;
        const mapFields = (fields: PortalFieldWithValue[]) =>
          fields.map(f => f.fieldKey in updatedMap ? { ...f, value: updatedMap[f.fieldKey] } : f);
        return {
          sections: prev.sections.map(s => ({ ...s, fields: mapFields(s.fields) })),
          orphanFields: mapFields(prev.orphanFields),
        };
      });
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await portalApi.post("/portal/documents", form, { headers: { "Content-Type": "multipart/form-data" } });
      setDocuments(prev => [data, ...prev]);
    } catch {}
    setUploading(false);
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await portalApi.delete(`/portal/documents/${id}`);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const formatBytes = (n: number) => n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

  const hasPortalContent = portalFields && (portalFields.sections.length > 0 || portalFields.orphanFields.length > 0);

  return (
    <PortalShell>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Record</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your personal data record managed by the organization</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {/* CRM Record */}
            {!crmData?.record ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Database className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-700">No record linked</h3>
                <p className="text-sm text-gray-400 mt-1">Your account hasn&apos;t been linked to a record yet.</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{crmData.module?.name ?? "Record"}</p>
                    <p className="text-xs text-gray-400">Record ID: {crmData.record.id.slice(0, 8)}...</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-400">Created</p>
                    <p className="text-xs text-gray-600">{new Date(crmData.record.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-50">
                    <h2 className="text-sm font-semibold text-gray-800">Record Details</h2>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {crmData.fields.map(field => (
                      <div key={field.id} className="px-5 py-3.5 flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
                        <div className="w-full sm:w-44 shrink-0">
                          <p className="text-sm font-medium text-gray-600 truncate">{field.label || field.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{field.type.toLowerCase().replace(/_/g, " ")}</p>
                        </div>
                        <div className="flex-1 w-full min-w-0">
                          <CrmFieldValue field={field} value={crmData.record!.data[field.name]} />
                        </div>
                      </div>
                    ))}
                    {crmData.fields.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-8">No fields defined</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Portal Fields */}
            {hasPortalContent && (
              <>
                {portalFields!.sections.map(section => (
                  <SectionBlock key={section.id} section={section} onSave={savePortalValues} />
                ))}

                {portalFields!.orphanFields.length > 0 && (
                  <SectionBlock
                    section={{ id: "__orphan__", label: "Additional Information", type: "section", isCollapsible: false, fields: portalFields!.orphanFields }}
                    onSave={savePortalValues}
                  />
                )}
              </>
            )}

            {/* Documents */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Documents</h2>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
                />
              </div>
              {documents.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-10 text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No documents yet — click to upload</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                      <FileIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{doc.originalName}</p>
                        <p className="text-xs text-gray-400">{formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => deleteDoc(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
