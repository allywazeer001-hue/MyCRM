"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import {
  Loader2, ChevronRight, Sparkles, LayoutGrid, Globe,
  CheckCircle, AlertCircle, ArrowRight,
} from "lucide-react";

// ── Built-in template definitions ─────────────────────────────────────────────
const BUILTIN_TEMPLATES = [
  {
    id: "preset-student",
    icon: "🎓",
    name: "Student Portal",
    description: "Academic records, attendance, results, and document uploads",
    category: "Education",
    color: "indigo",
    snapshot: {
      pages: [
        {
          title: "My Profile", slug: "my-profile", layoutTemplate: "sidebar",
          sections: [
            {
              label: "Personal Information", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Full Name", fieldKey: "full_name", fieldType: "text", isRequired: true, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Student ID", fieldKey: "student_id", fieldType: "text", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
                { label: "Email Address", fieldKey: "email", fieldType: "email", isRequired: true, isEditable: true, options: [], order: 2 },
                { label: "Phone Number", fieldKey: "phone", fieldType: "phone", isRequired: false, isEditable: true, options: [], order: 3 },
                { label: "Date of Birth", fieldKey: "dob", fieldType: "date", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 4 },
              ],
            },
            {
              label: "Enrollment Details", columnIndex: 1, order: 1, isCollapsible: false,
              fields: [
                { label: "Program / Course", fieldKey: "program", fieldType: "text", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Year / Level", fieldKey: "year_level", fieldType: "text", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
                { label: "Enrollment Status", fieldKey: "enrollment_status", fieldType: "dropdown", isRequired: false, isEditable: false, isReadOnly: true, options: [{ label: "Active", value: "active" }, { label: "Suspended", value: "suspended" }, { label: "Graduated", value: "graduated" }], order: 2 },
              ],
            },
          ],
        },
        {
          title: "Academic Records", slug: "academic-records", layoutTemplate: "two-column",
          sections: [
            {
              label: "Results & Grades", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Current GPA", fieldKey: "gpa", fieldType: "number", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Academic Standing", fieldKey: "standing", fieldType: "dropdown", isRequired: false, isEditable: false, isReadOnly: true, options: [{ label: "Good Standing", value: "good" }, { label: "Probation", value: "probation" }, { label: "Honors", value: "honors" }], order: 1 },
                { label: "Credits Completed", fieldKey: "credits", fieldType: "number", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 2 },
              ],
            },
            {
              label: "Attendance", columnIndex: 1, order: 1, isCollapsible: true,
              fields: [
                { label: "Attendance Rate (%)", fieldKey: "attendance_rate", fieldType: "number", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Total Absences", fieldKey: "absences", fieldType: "number", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
              ],
            },
          ],
        },
        {
          title: "Payments & Fees", slug: "payments-fees", layoutTemplate: "single",
          sections: [
            {
              label: "Payment Summary", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Total Fees", fieldKey: "total_fees", fieldType: "currency", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Amount Paid", fieldKey: "amount_paid", fieldType: "currency", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
                { label: "Outstanding Balance", fieldKey: "balance", fieldType: "currency", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 2 },
                { label: "Payment Status", fieldKey: "payment_status", fieldType: "dropdown", isRequired: false, isEditable: false, isReadOnly: true, options: [{ label: "Paid", value: "paid" }, { label: "Partial", value: "partial" }, { label: "Overdue", value: "overdue" }], order: 3 },
              ],
            },
          ],
        },
        {
          title: "My Documents", slug: "my-documents", layoutTemplate: "single",
          sections: [
            {
              label: "Upload Documents", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Upload Document", fieldKey: "doc_upload", fieldType: "upload", isRequired: false, isEditable: true, options: [], order: 0 },
                { label: "Document Notes", fieldKey: "doc_notes", fieldType: "textarea", isRequired: false, isEditable: true, options: [], order: 1 },
              ],
            },
          ],
        },
      ],
      menus: [
        { label: "My Profile", icon: "👤", type: "page", target: "/portal/pages/my-profile", order: 0, isVisible: true },
        { label: "Academic Records", icon: "📊", type: "page", target: "/portal/pages/academic-records", order: 1, isVisible: true },
        { label: "Payments", icon: "💳", type: "page", target: "/portal/pages/payments-fees", order: 2, isVisible: true },
        { label: "My Documents", icon: "📁", type: "page", target: "/portal/pages/my-documents", order: 3, isVisible: true },
      ],
    },
  },
  {
    id: "preset-employee",
    icon: "💼",
    name: "Employee Portal",
    description: "HR self-service: profile, leave requests, and payslips",
    category: "HR",
    color: "blue",
    snapshot: {
      pages: [
        {
          title: "My Profile", slug: "employee-profile", layoutTemplate: "sidebar",
          sections: [
            {
              label: "Employee Information", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Full Name", fieldKey: "full_name", fieldType: "text", isRequired: true, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Employee ID", fieldKey: "employee_id", fieldType: "text", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
                { label: "Job Title", fieldKey: "job_title", fieldType: "text", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 2 },
                { label: "Department", fieldKey: "department", fieldType: "text", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 3 },
                { label: "Work Email", fieldKey: "work_email", fieldType: "email", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 4 },
                { label: "Phone", fieldKey: "phone", fieldType: "phone", isRequired: false, isEditable: true, options: [], order: 5 },
              ],
            },
            {
              label: "Employment Details", columnIndex: 1, order: 1, isCollapsible: false,
              fields: [
                { label: "Start Date", fieldKey: "start_date", fieldType: "date", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Contract Type", fieldKey: "contract_type", fieldType: "dropdown", isRequired: false, isEditable: false, isReadOnly: true, options: [{ label: "Full-time", value: "fulltime" }, { label: "Part-time", value: "parttime" }, { label: "Contract", value: "contract" }], order: 1 },
              ],
            },
          ],
        },
        {
          title: "Leave Requests", slug: "leave-requests", layoutTemplate: "two-column",
          sections: [
            {
              label: "Leave Balance", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Annual Leave Remaining", fieldKey: "annual_leave", fieldType: "number", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Sick Leave Remaining", fieldKey: "sick_leave", fieldType: "number", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
              ],
            },
            {
              label: "Request Leave", columnIndex: 1, order: 1, isCollapsible: false,
              fields: [
                { label: "Leave Type", fieldKey: "leave_type", fieldType: "dropdown", isRequired: true, isEditable: true, options: [{ label: "Annual", value: "annual" }, { label: "Sick", value: "sick" }, { label: "Unpaid", value: "unpaid" }], order: 0 },
                { label: "From Date", fieldKey: "leave_from", fieldType: "date", isRequired: true, isEditable: true, options: [], order: 1 },
                { label: "To Date", fieldKey: "leave_to", fieldType: "date", isRequired: true, isEditable: true, options: [], order: 2 },
                { label: "Reason", fieldKey: "leave_reason", fieldType: "textarea", isRequired: false, isEditable: true, options: [], order: 3 },
              ],
            },
          ],
        },
        {
          title: "My Documents", slug: "employee-documents", layoutTemplate: "single",
          sections: [
            {
              label: "HR Documents", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Upload Document", fieldKey: "doc_upload", fieldType: "upload", isRequired: false, isEditable: true, options: [], order: 0 },
                { label: "Document Type", fieldKey: "doc_type", fieldType: "dropdown", isRequired: false, isEditable: true, options: [{ label: "Contract", value: "contract" }, { label: "Certificate", value: "certificate" }, { label: "Other", value: "other" }], order: 1 },
              ],
            },
          ],
        },
      ],
      menus: [
        { label: "My Profile", icon: "👤", type: "page", target: "/portal/pages/employee-profile", order: 0, isVisible: true },
        { label: "Leave Requests", icon: "📅", type: "page", target: "/portal/pages/leave-requests", order: 1, isVisible: true },
        { label: "Documents", icon: "📁", type: "page", target: "/portal/pages/employee-documents", order: 2, isVisible: true },
      ],
    },
  },
  {
    id: "preset-patient",
    icon: "🏥",
    name: "Member Portal (Generic)",
    description: "Member profile, appointments, and document uploads — configure field keys to match your module",
    category: "Healthcare",
    color: "rose",
    snapshot: {
      pages: [
        {
          title: "My Health Profile", slug: "health-profile", layoutTemplate: "two-column",
          sections: [
            {
              label: "Member Information", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Full Name", fieldKey: "full_name", fieldType: "text", isRequired: true, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Member ID", fieldKey: "", fieldType: "text", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
                { label: "Date of Birth", fieldKey: "dob", fieldType: "date", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 2 },
                { label: "Category / Type", fieldKey: "", fieldType: "dropdown", isRequired: false, isEditable: true, options: [], order: 3 },
              ],
            },
            {
              label: "Contact & Emergency", columnIndex: 1, order: 1, isCollapsible: false,
              fields: [
                { label: "Phone Number", fieldKey: "phone", fieldType: "phone", isRequired: false, isEditable: true, options: [], order: 0 },
                { label: "Email", fieldKey: "email", fieldType: "email", isRequired: false, isEditable: true, options: [], order: 1 },
                { label: "Emergency Contact", fieldKey: "emergency_name", fieldType: "text", isRequired: false, isEditable: true, options: [], order: 2 },
                { label: "Emergency Phone", fieldKey: "emergency_phone", fieldType: "phone", isRequired: false, isEditable: true, options: [], order: 3 },
              ],
            },
          ],
        },
        {
          title: "Appointments", slug: "appointments", layoutTemplate: "single",
          sections: [
            {
              label: "Upcoming Appointments", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Next Appointment", fieldKey: "next_appointment", fieldType: "datetime", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Assigned Contact", fieldKey: "", fieldType: "text", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
                { label: "Appointment Type", fieldKey: "apt_type", fieldType: "dropdown", isRequired: false, isEditable: false, isReadOnly: true, options: [{ label: "Consultation", value: "consultation" }, { label: "Follow-up", value: "followup" }], order: 2 },
              ],
            },
          ],
        },
      ],
      menus: [
        { label: "Health Profile", icon: "🏥", type: "page", target: "/portal/pages/health-profile", order: 0, isVisible: true },
        { label: "Appointments", icon: "📅", type: "page", target: "/portal/pages/appointments", order: 1, isVisible: true },
      ],
    },
  },
  {
    id: "preset-customer",
    icon: "🤝",
    name: "Customer Portal",
    description: "Account overview, order history, invoices, and support",
    category: "CRM",
    color: "violet",
    snapshot: {
      pages: [
        {
          title: "My Account", slug: "my-account", layoutTemplate: "sidebar",
          sections: [
            {
              label: "Account Details", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Company Name", fieldKey: "company", fieldType: "text", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Contact Name", fieldKey: "contact_name", fieldType: "text", isRequired: false, isEditable: true, options: [], order: 1 },
                { label: "Email", fieldKey: "email", fieldType: "email", isRequired: true, isEditable: true, options: [], order: 2 },
                { label: "Phone", fieldKey: "phone", fieldType: "phone", isRequired: false, isEditable: true, options: [], order: 3 },
              ],
            },
            {
              label: "Account Summary", columnIndex: 1, order: 1, isCollapsible: false,
              fields: [
                { label: "Account Type", fieldKey: "", fieldType: "dropdown", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Member Since", fieldKey: "", fieldType: "date", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
                { label: "Outstanding Balance", fieldKey: "", fieldType: "currency", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 2 },
              ],
            },
          ],
        },
        {
          title: "Invoices & Payments", slug: "invoices-payments", layoutTemplate: "single",
          sections: [
            {
              label: "Payment Summary", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Total Invoiced", fieldKey: "total_invoiced", fieldType: "currency", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Total Paid", fieldKey: "total_paid", fieldType: "currency", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
                { label: "Outstanding", fieldKey: "outstanding", fieldType: "currency", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 2 },
              ],
            },
          ],
        },
      ],
      menus: [
        { label: "My Account", icon: "🏢", type: "page", target: "/portal/pages/my-account", order: 0, isVisible: true },
        { label: "Invoices", icon: "💳", type: "page", target: "/portal/pages/invoices-payments", order: 1, isVisible: true },
      ],
    },
  },
  {
    id: "preset-vendor",
    icon: "🏭",
    name: "Vendor Portal",
    description: "Supplier profile, purchase orders, and compliance documents",
    category: "Procurement",
    color: "amber",
    snapshot: {
      pages: [
        {
          title: "Vendor Profile", slug: "vendor-profile", layoutTemplate: "two-column",
          sections: [
            {
              label: "Company Details", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Company Name", fieldKey: "company_name", fieldType: "text", isRequired: true, isEditable: false, isReadOnly: true, options: [], order: 0 },
                { label: "Vendor Code", fieldKey: "vendor_code", fieldType: "text", isRequired: false, isEditable: false, isReadOnly: true, options: [], order: 1 },
                { label: "Category", fieldKey: "category", fieldType: "dropdown", isRequired: false, isEditable: false, isReadOnly: true, options: [{ label: "Supplier", value: "supplier" }, { label: "Contractor", value: "contractor" }], order: 2 },
                { label: "Status", fieldKey: "vendor_status", fieldType: "dropdown", isRequired: false, isEditable: false, isReadOnly: true, options: [{ label: "Approved", value: "approved" }, { label: "Pending", value: "pending" }], order: 3 },
              ],
            },
            {
              label: "Contact Information", columnIndex: 1, order: 1, isCollapsible: false,
              fields: [
                { label: "Primary Contact", fieldKey: "contact_name", fieldType: "text", isRequired: false, isEditable: true, options: [], order: 0 },
                { label: "Email", fieldKey: "email", fieldType: "email", isRequired: true, isEditable: true, options: [], order: 1 },
                { label: "Phone", fieldKey: "phone", fieldType: "phone", isRequired: false, isEditable: true, options: [], order: 2 },
              ],
            },
          ],
        },
        {
          title: "Compliance Documents", slug: "vendor-documents", layoutTemplate: "single",
          sections: [
            {
              label: "Upload Documents", columnIndex: 0, order: 0, isCollapsible: false,
              fields: [
                { label: "Upload Document", fieldKey: "doc_upload", fieldType: "upload", isRequired: false, isEditable: true, options: [], order: 0 },
                { label: "Document Type", fieldKey: "doc_type", fieldType: "dropdown", isRequired: false, isEditable: true, options: [{ label: "Registration Cert", value: "reg" }, { label: "Tax Certificate", value: "tax" }, { label: "Insurance", value: "insurance" }], order: 1 },
                { label: "Expiry Date", fieldKey: "doc_expiry", fieldType: "date", isRequired: false, isEditable: true, options: [], order: 2 },
              ],
            },
          ],
        },
      ],
      menus: [
        { label: "Vendor Profile", icon: "🏭", type: "page", target: "/portal/pages/vendor-profile", order: 0, isVisible: true },
        { label: "Documents", icon: "📁", type: "page", target: "/portal/pages/vendor-documents", order: 1, isVisible: true },
      ],
    },
  },
];

type ApplyState = "idle" | "applying" | "done" | "error";

const COLOR_CARD: Record<string, string> = {
  indigo: "border-indigo-800/60 hover:border-indigo-500 bg-indigo-950/20",
  blue:   "border-blue-800/60 hover:border-blue-500 bg-blue-950/20",
  rose:   "border-rose-800/60 hover:border-rose-500 bg-rose-950/20",
  violet: "border-violet-800/60 hover:border-violet-500 bg-violet-950/20",
  amber:  "border-amber-800/60 hover:border-amber-500 bg-amber-950/20",
};
const COLOR_BADGE: Record<string, string> = {
  indigo: "bg-indigo-900/50 text-indigo-300",
  blue:   "bg-blue-900/50 text-blue-300",
  rose:   "bg-rose-900/50 text-rose-300",
  violet: "bg-violet-900/50 text-violet-300",
  amber:  "bg-amber-900/50 text-amber-300",
};
const COLOR_BTN: Record<string, string> = {
  indigo: "bg-indigo-600 hover:bg-indigo-500",
  blue:   "bg-blue-600 hover:bg-blue-500",
  rose:   "bg-rose-600 hover:bg-rose-500",
  violet: "bg-violet-600 hover:bg-violet-500",
  amber:  "bg-amber-600 hover:bg-amber-500",
};

function TemplateCard({ tpl }: { tpl: typeof BUILTIN_TEMPLATES[0] }) {
  const router = useRouter();
  const [state, setState] = useState<ApplyState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState("");

  const apply = async () => {
    setState("applying");
    setErrorMsg("");
    try {
      setProgress("Saving portal structure...");
      const created = await portalApi.post("/portal/padmin/templates", {
        name: `__apply_${tpl.id}_${Date.now()}`,
        category: "auto",
        includeMenus: false,
        snapshot: tpl.snapshot,
      } as any);
      const templateId = created.data.id;

      setProgress("Creating pages & sections...");
      const result = await portalApi.post(`/portal/padmin/templates/${templateId}/apply`);

      setProgress("Restoring navigation menus...");
      for (const m of tpl.snapshot.menus) {
        try {
          await portalApi.post("/portal/padmin/menu", {
            label: m.label, icon: m.icon, type: m.type, target: m.target, isVisible: m.isVisible,
          });
        } catch {}
      }

      await portalApi.delete(`/portal/padmin/templates/${templateId}`).catch(() => {});

      setState("done");
      setProgress("Portal created!");

      const createdPages: any[] = result.data.pages ?? [];
      setTimeout(() => {
        if (createdPages.length > 0) {
          router.push(`/apps/portal-builder/pages/${createdPages[0].id}`);
        } else {
          router.push("/apps/portal-builder/publish");
        }
      }, 800);
    } catch (e: any) {
      setState("error");
      setErrorMsg(e?.response?.data?.message ?? "Something went wrong. Try again.");
    }
  };

  return (
    <div className={`relative border rounded-xl p-5 transition-all ${COLOR_CARD[tpl.color]} ${state === "applying" ? "opacity-90" : ""}`}>
      {/* Applying overlay */}
      {state === "applying" && (
        <div className="absolute inset-0 rounded-xl bg-gray-950/70 flex flex-col items-center justify-center z-10 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-xs text-gray-300 font-medium">{progress}</p>
        </div>
      )}

      {/* Done overlay */}
      {state === "done" && (
        <div className="absolute inset-0 rounded-xl bg-gray-950/70 flex flex-col items-center justify-center z-10 gap-2">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <p className="text-xs text-green-300 font-medium">Portal created! Redirecting...</p>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{tpl.icon}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLOR_BADGE[tpl.color]}`}>{tpl.category}</span>
      </div>
      <h3 className="text-sm font-bold text-white mb-1">{tpl.name}</h3>
      <p className="text-xs text-gray-400 mb-3 leading-relaxed">{tpl.description}</p>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1">
          <LayoutGrid className="w-3 h-3" />
          {tpl.snapshot.pages.length} page{tpl.snapshot.pages.length !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <Globe className="w-3 h-3" />
          {tpl.snapshot.menus.length} menu item{tpl.snapshot.menus.length !== 1 ? "s" : ""}
        </span>
      </div>

      {state === "error" && (
        <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{errorMsg}
        </p>
      )}

      <button
        onClick={apply}
        disabled={state === "applying" || state === "done"}
        className={`w-full flex items-center justify-center gap-2 py-2 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${COLOR_BTN[tpl.color]}`}
      >
        {state === "applying" ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" />Applying...</>
        ) : state === "error" ? (
          <><ArrowRight className="w-3.5 h-3.5" />Try Again</>
        ) : (
          <><ChevronRight className="w-3.5 h-3.5" />Use This Template</>
        )}
      </button>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Portal Template Library
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Choose a ready-made portal template to get started instantly. All pages, sections, fields, and menus are created automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BUILTIN_TEMPLATES.map(tpl => (
          <TemplateCard key={tpl.id} tpl={tpl} />
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-900/50 flex items-center justify-center shrink-0">
          <ArrowRight className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm text-white font-medium">Want to reuse your own portal?</p>
          <p className="text-xs text-gray-500">Go to <span className="text-indigo-400 font-medium">My Templates</span> to save your current portal setup or apply a previously saved template.</p>
        </div>
      </div>
    </div>
  );
}
