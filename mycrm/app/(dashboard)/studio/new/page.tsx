"use client";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Loader2, Search, Check, ChevronRight, Sparkles, X,
  LayoutGrid, Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { IconPicker } from "@/components/ui/icon-picker";
import { useModulesStore } from "@/store/modules.store";
import { slugify, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

interface TemplateField {
  name: string;
  label: string;
  type: string;
  isRequired?: boolean;
  options?: { label: string; value: string; color?: string }[];
}

interface ModuleTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  color: string;
  fields: TemplateField[];
}

// ── Template Data ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",       label: "All Templates",  icon: "⊞",  color: "#6366f1" },
  { id: "marketing", label: "Marketing",       icon: "📢", color: "#f59e0b" },
  { id: "banking",   label: "Banking",         icon: "🏦", color: "#3b82f6" },
  { id: "hospital",  label: "Hospital",        icon: "🏥", color: "#ef4444" },
  { id: "school",    label: "School",          icon: "🎓", color: "#8b5cf6" },
  { id: "ngo",       label: "NGO",             icon: "🤝", color: "#10b981" },
  { id: "hr",        label: "HR",              icon: "👥", color: "#06b6d4" },
  { id: "finance",   label: "Finance",         icon: "💰", color: "#f97316" },
  { id: "inventory", label: "Inventory",       icon: "📦", color: "#84cc16" },
];

const TEMPLATES: ModuleTemplate[] = [
  // ── Marketing ────────────────────────────────────────────────────────────
  {
    id: "leads",
    name: "Leads Pipeline",
    icon: "🎯",
    description: "Track prospects through your sales funnel",
    category: "marketing",
    color: "#f59e0b",
    fields: [
      { name: "full_name",  label: "Full Name",    type: "TEXT",     isRequired: true },
      { name: "email",      label: "Email",         type: "EMAIL" },
      { name: "phone",      label: "Phone",         type: "PHONE" },
      { name: "company",    label: "Company",       type: "TEXT" },
      { name: "source",     label: "Lead Source",   type: "DROPDOWN",
        options: [{ label: "Website", value: "website" }, { label: "Referral", value: "referral" },
                  { label: "LinkedIn", value: "linkedin" }, { label: "Cold Call", value: "cold_call" },
                  { label: "Event", value: "event" }] },
      { name: "status",     label: "Status",        type: "STATUS",
        options: [{ label: "New", value: "new", color: "#6366f1" }, { label: "Contacted", value: "contacted", color: "#f59e0b" },
                  { label: "Qualified", value: "qualified", color: "#3b82f6" }, { label: "Proposal", value: "proposal", color: "#8b5cf6" },
                  { label: "Won", value: "won", color: "#10b981" }, { label: "Lost", value: "lost", color: "#ef4444" }] },
      { name: "score",      label: "Lead Score",    type: "NUMBER" },
      { name: "notes",      label: "Notes",         type: "TEXTAREA" },
    ],
  },
  {
    id: "campaigns",
    name: "Campaign Tracker",
    icon: "📢",
    description: "Manage marketing campaigns and measure ROI",
    category: "marketing",
    color: "#f59e0b",
    fields: [
      { name: "campaign_name", label: "Campaign Name", type: "TEXT",   isRequired: true },
      { name: "type",          label: "Type",           type: "DROPDOWN",
        options: [{ label: "Email", value: "email" }, { label: "Social Media", value: "social" },
                  { label: "PPC", value: "ppc" }, { label: "Event", value: "event" }, { label: "Content", value: "content" }] },
      { name: "budget",        label: "Budget",         type: "CURRENCY" },
      { name: "start_date",    label: "Start Date",     type: "DATE" },
      { name: "end_date",      label: "End Date",       type: "DATE" },
      { name: "status",        label: "Status",         type: "STATUS",
        options: [{ label: "Planning", value: "planning", color: "#6366f1" }, { label: "Active", value: "active", color: "#10b981" },
                  { label: "Paused", value: "paused", color: "#f59e0b" }, { label: "Completed", value: "completed", color: "#6b7280" }] },
      { name: "notes",         label: "Notes",          type: "TEXTAREA" },
    ],
  },
  {
    id: "email_subscribers",
    name: "Email Subscribers",
    icon: "✉️",
    description: "Manage your subscriber list and segments",
    category: "marketing",
    color: "#f59e0b",
    fields: [
      { name: "name",        label: "Name",           type: "TEXT",  isRequired: true },
      { name: "email",       label: "Email",          type: "EMAIL", isRequired: true },
      { name: "status",      label: "Status",         type: "STATUS",
        options: [{ label: "Subscribed", value: "subscribed", color: "#10b981" }, { label: "Unsubscribed", value: "unsubscribed", color: "#ef4444" },
                  { label: "Bounced", value: "bounced", color: "#f59e0b" }] },
      { name: "source",      label: "Source",         type: "TEXT" },
      { name: "subscribed_date", label: "Subscribed Date", type: "DATE" },
      { name: "tags",        label: "Tags",            type: "TAGS" },
    ],
  },
  // ── Banking ───────────────────────────────────────────────────────────────
  {
    id: "bank_accounts",
    name: "Customer Accounts",
    icon: "🏦",
    description: "Manage customer bank accounts and balances",
    category: "banking",
    color: "#3b82f6",
    fields: [
      { name: "account_number", label: "Account Number",  type: "TEXT",     isRequired: true },
      { name: "holder_name",    label: "Account Holder",  type: "TEXT",     isRequired: true },
      { name: "type",           label: "Account Type",    type: "DROPDOWN",
        options: [{ label: "Savings", value: "savings" }, { label: "Checking", value: "checking" },
                  { label: "Current", value: "current" }, { label: "Fixed Deposit", value: "fixed_deposit" }] },
      { name: "balance",        label: "Balance",         type: "CURRENCY" },
      { name: "status",         label: "Status",          type: "STATUS",
        options: [{ label: "Active", value: "active", color: "#10b981" }, { label: "Suspended", value: "suspended", color: "#f59e0b" },
                  { label: "Closed", value: "closed", color: "#ef4444" }] },
      { name: "branch",         label: "Branch",          type: "TEXT" },
      { name: "opened_date",    label: "Opened Date",     type: "DATE" },
    ],
  },
  {
    id: "transactions",
    name: "Transactions",
    icon: "💳",
    description: "Log and track all financial transactions",
    category: "banking",
    color: "#3b82f6",
    fields: [
      { name: "date",       label: "Transaction Date",  type: "DATE",     isRequired: true },
      { name: "amount",     label: "Amount",            type: "CURRENCY", isRequired: true },
      { name: "type",       label: "Type",              type: "DROPDOWN",
        options: [{ label: "Credit", value: "credit" }, { label: "Debit", value: "debit" }, { label: "Transfer", value: "transfer" }] },
      { name: "description", label: "Description",      type: "TEXT" },
      { name: "reference",  label: "Reference Number",  type: "TEXT" },
      { name: "account",    label: "Account",           type: "TEXT" },
      { name: "status",     label: "Status",            type: "STATUS",
        options: [{ label: "Completed", value: "completed", color: "#10b981" }, { label: "Pending", value: "pending", color: "#f59e0b" },
                  { label: "Failed", value: "failed", color: "#ef4444" }] },
    ],
  },
  {
    id: "loans",
    name: "Loan Management",
    icon: "💰",
    description: "Track loans, repayments, and interest schedules",
    category: "banking",
    color: "#3b82f6",
    fields: [
      { name: "borrower",      label: "Borrower Name",  type: "TEXT",     isRequired: true },
      { name: "email",         label: "Email",          type: "EMAIL" },
      { name: "amount",        label: "Loan Amount",    type: "CURRENCY", isRequired: true },
      { name: "interest_rate", label: "Interest Rate",  type: "DECIMAL" },
      { name: "term_months",   label: "Term (Months)",  type: "NUMBER" },
      { name: "start_date",    label: "Start Date",     type: "DATE" },
      { name: "end_date",      label: "End Date",       type: "DATE" },
      { name: "status",        label: "Status",         type: "STATUS",
        options: [{ label: "Applied", value: "applied", color: "#6366f1" }, { label: "Approved", value: "approved", color: "#3b82f6" },
                  { label: "Disbursed", value: "disbursed", color: "#8b5cf6" }, { label: "Active", value: "active", color: "#f59e0b" },
                  { label: "Paid", value: "paid", color: "#10b981" }, { label: "Defaulted", value: "defaulted", color: "#ef4444" }] },
    ],
  },
  // ── Hospital ──────────────────────────────────────────────────────────────
  {
    id: "patients",
    name: "Patient Registry",
    icon: "🏥",
    description: "Manage patient information and medical history",
    category: "hospital",
    color: "#ef4444",
    fields: [
      { name: "full_name",         label: "Full Name",         type: "TEXT",     isRequired: true },
      { name: "dob",               label: "Date of Birth",     type: "DATE" },
      { name: "gender",            label: "Gender",            type: "DROPDOWN",
        options: [{ label: "Male", value: "male" }, { label: "Female", value: "female" }, { label: "Other", value: "other" }] },
      { name: "blood_type",        label: "Blood Type",        type: "DROPDOWN",
        options: [{ label: "A+", value: "a_pos" }, { label: "A-", value: "a_neg" }, { label: "B+", value: "b_pos" },
                  { label: "B-", value: "b_neg" }, { label: "AB+", value: "ab_pos" }, { label: "AB-", value: "ab_neg" },
                  { label: "O+", value: "o_pos" }, { label: "O-", value: "o_neg" }] },
      { name: "phone",             label: "Phone",             type: "PHONE" },
      { name: "email",             label: "Email",             type: "EMAIL" },
      { name: "address",           label: "Address",           type: "TEXTAREA" },
      { name: "emergency_contact", label: "Emergency Contact", type: "TEXT" },
    ],
  },
  {
    id: "appointments",
    name: "Appointments",
    icon: "📅",
    description: "Schedule and track medical appointments",
    category: "hospital",
    color: "#ef4444",
    fields: [
      { name: "patient",  label: "Patient Name", type: "TEXT",     isRequired: true },
      { name: "doctor",   label: "Doctor",        type: "TEXT",     isRequired: true },
      { name: "date",     label: "Date",          type: "DATE",     isRequired: true },
      { name: "time",     label: "Time",          type: "TEXT" },
      { name: "type",     label: "Type",          type: "DROPDOWN",
        options: [{ label: "Consultation", value: "consultation" }, { label: "Follow-up", value: "followup" },
                  { label: "Emergency", value: "emergency" }, { label: "Procedure", value: "procedure" }] },
      { name: "status",   label: "Status",        type: "STATUS",
        options: [{ label: "Scheduled", value: "scheduled", color: "#6366f1" }, { label: "Confirmed", value: "confirmed", color: "#3b82f6" },
                  { label: "Completed", value: "completed", color: "#10b981" }, { label: "Cancelled", value: "cancelled", color: "#ef4444" },
                  { label: "No Show", value: "no_show", color: "#f59e0b" }] },
      { name: "notes",    label: "Notes",         type: "TEXTAREA" },
    ],
  },
  {
    id: "medical_records",
    name: "Medical Records",
    icon: "🩺",
    description: "Clinical records, diagnoses, and treatments",
    category: "hospital",
    color: "#ef4444",
    fields: [
      { name: "patient",     label: "Patient",       type: "TEXT",     isRequired: true },
      { name: "date",        label: "Visit Date",    type: "DATE",     isRequired: true },
      { name: "doctor",      label: "Doctor",        type: "TEXT" },
      { name: "diagnosis",   label: "Diagnosis",     type: "TEXTAREA" },
      { name: "treatment",   label: "Treatment",     type: "TEXTAREA" },
      { name: "prescription", label: "Prescriptions", type: "TEXTAREA" },
      { name: "followup_date", label: "Follow-up Date", type: "DATE" },
    ],
  },
  // ── School ────────────────────────────────────────────────────────────────
  {
    id: "students",
    name: "Student Roster",
    icon: "🎓",
    description: "Track student information and enrollment",
    category: "school",
    color: "#8b5cf6",
    fields: [
      { name: "full_name",       label: "Full Name",      type: "TEXT",     isRequired: true },
      { name: "student_id",      label: "Student ID",     type: "TEXT" },
      { name: "class_grade",     label: "Class / Grade",  type: "TEXT" },
      { name: "dob",             label: "Date of Birth",  type: "DATE" },
      { name: "parent_name",     label: "Parent Name",    type: "TEXT" },
      { name: "parent_phone",    label: "Parent Phone",   type: "PHONE" },
      { name: "email",           label: "Email",          type: "EMAIL" },
      { name: "enrollment_date", label: "Enrolled On",    type: "DATE" },
      { name: "status",          label: "Status",         type: "STATUS",
        options: [{ label: "Active", value: "active", color: "#10b981" }, { label: "Inactive", value: "inactive", color: "#6b7280" },
                  { label: "Graduated", value: "graduated", color: "#8b5cf6" }] },
    ],
  },
  {
    id: "courses",
    name: "Course Catalog",
    icon: "📚",
    description: "Manage curriculum, subjects, and instructors",
    category: "school",
    color: "#8b5cf6",
    fields: [
      { name: "course_name", label: "Course Name",  type: "TEXT",    isRequired: true },
      { name: "code",        label: "Course Code",  type: "TEXT" },
      { name: "instructor",  label: "Instructor",   type: "TEXT" },
      { name: "credits",     label: "Credits",      type: "NUMBER" },
      { name: "schedule",    label: "Schedule",     type: "TEXT" },
      { name: "room",        label: "Room",         type: "TEXT" },
      { name: "capacity",    label: "Max Students", type: "NUMBER" },
      { name: "status",      label: "Status",       type: "STATUS",
        options: [{ label: "Active", value: "active", color: "#10b981" }, { label: "Inactive", value: "inactive", color: "#6b7280" }] },
    ],
  },
  {
    id: "attendance",
    name: "Attendance Register",
    icon: "✅",
    description: "Daily attendance tracking for students",
    category: "school",
    color: "#8b5cf6",
    fields: [
      { name: "student",   label: "Student",   type: "TEXT",     isRequired: true },
      { name: "date",      label: "Date",      type: "DATE",     isRequired: true },
      { name: "class",     label: "Class",     type: "TEXT" },
      { name: "status",    label: "Status",    type: "STATUS",
        options: [{ label: "Present", value: "present", color: "#10b981" }, { label: "Absent", value: "absent", color: "#ef4444" },
                  { label: "Late", value: "late", color: "#f59e0b" }, { label: "Excused", value: "excused", color: "#6366f1" }] },
      { name: "notes",     label: "Notes",     type: "TEXTAREA" },
    ],
  },
  // ── NGO ───────────────────────────────────────────────────────────────────
  {
    id: "donors",
    name: "Donor Database",
    icon: "💝",
    description: "Manage donors, contributions, and giving history",
    category: "ngo",
    color: "#10b981",
    fields: [
      { name: "name",               label: "Name",               type: "TEXT",     isRequired: true },
      { name: "email",              label: "Email",              type: "EMAIL" },
      { name: "phone",              label: "Phone",              type: "PHONE" },
      { name: "type",               label: "Donor Type",         type: "DROPDOWN",
        options: [{ label: "Individual", value: "individual" }, { label: "Corporate", value: "corporate" }, { label: "Foundation", value: "foundation" }] },
      { name: "total_donated",      label: "Total Donated",      type: "CURRENCY" },
      { name: "last_donation_date", label: "Last Donation Date", type: "DATE" },
      { name: "status",             label: "Status",             type: "STATUS",
        options: [{ label: "Active", value: "active", color: "#10b981" }, { label: "Lapsed", value: "lapsed", color: "#f59e0b" },
                  { label: "Inactive", value: "inactive", color: "#6b7280" }] },
      { name: "notes",              label: "Notes",              type: "TEXTAREA" },
    ],
  },
  {
    id: "ngo_projects",
    name: "Projects",
    icon: "🌍",
    description: "Track community and development projects",
    category: "ngo",
    color: "#10b981",
    fields: [
      { name: "project_name",   label: "Project Name",  type: "TEXT",     isRequired: true },
      { name: "budget",         label: "Budget",        type: "CURRENCY" },
      { name: "start_date",     label: "Start Date",    type: "DATE" },
      { name: "end_date",       label: "End Date",      type: "DATE" },
      { name: "beneficiaries",  label: "Beneficiaries", type: "NUMBER" },
      { name: "location",       label: "Location",      type: "TEXT" },
      { name: "status",         label: "Status",        type: "STATUS",
        options: [{ label: "Planning", value: "planning", color: "#6366f1" }, { label: "Active", value: "active", color: "#10b981" },
                  { label: "Completed", value: "completed", color: "#6b7280" }, { label: "Suspended", value: "suspended", color: "#ef4444" }] },
      { name: "description",    label: "Description",   type: "TEXTAREA" },
    ],
  },
  {
    id: "beneficiaries",
    name: "Beneficiary Registry",
    icon: "🤝",
    description: "Program beneficiary information and tracking",
    category: "ngo",
    color: "#10b981",
    fields: [
      { name: "full_name", label: "Full Name", type: "TEXT",  isRequired: true },
      { name: "dob",       label: "Date of Birth", type: "DATE" },
      { name: "location",  label: "Location",  type: "TEXT" },
      { name: "program",   label: "Program",   type: "TEXT" },
      { name: "contact",   label: "Contact",   type: "PHONE" },
      { name: "status",    label: "Status",    type: "STATUS",
        options: [{ label: "Active", value: "active", color: "#10b981" }, { label: "Inactive", value: "inactive", color: "#6b7280" },
                  { label: "Graduated", value: "graduated", color: "#8b5cf6" }] },
      { name: "notes",     label: "Notes",     type: "TEXTAREA" },
    ],
  },
  // ── HR ────────────────────────────────────────────────────────────────────
  {
    id: "employees",
    name: "Employee Directory",
    icon: "👤",
    description: "Staff database and core HR records",
    category: "hr",
    color: "#06b6d4",
    fields: [
      { name: "full_name",    label: "Full Name",    type: "TEXT",     isRequired: true },
      { name: "employee_id",  label: "Employee ID",  type: "TEXT" },
      { name: "email",        label: "Work Email",   type: "EMAIL" },
      { name: "phone",        label: "Phone",        type: "PHONE" },
      { name: "department",   label: "Department",   type: "DROPDOWN",
        options: [{ label: "Engineering", value: "engineering" }, { label: "Marketing", value: "marketing" },
                  { label: "Sales", value: "sales" }, { label: "HR", value: "hr" },
                  { label: "Finance", value: "finance" }, { label: "Operations", value: "operations" }] },
      { name: "position",     label: "Position",     type: "TEXT" },
      { name: "start_date",   label: "Start Date",   type: "DATE" },
      { name: "salary",       label: "Salary",       type: "CURRENCY" },
      { name: "status",       label: "Status",       type: "STATUS",
        options: [{ label: "Active", value: "active", color: "#10b981" }, { label: "On Leave", value: "on_leave", color: "#f59e0b" },
                  { label: "Resigned", value: "resigned", color: "#6b7280" }, { label: "Terminated", value: "terminated", color: "#ef4444" }] },
    ],
  },
  {
    id: "leave_requests",
    name: "Leave Requests",
    icon: "🏖️",
    description: "Leave and time-off request management",
    category: "hr",
    color: "#06b6d4",
    fields: [
      { name: "employee",   label: "Employee",    type: "TEXT",     isRequired: true },
      { name: "leave_type", label: "Leave Type",  type: "DROPDOWN",
        options: [{ label: "Annual", value: "annual" }, { label: "Sick", value: "sick" },
                  { label: "Maternity", value: "maternity" }, { label: "Paternity", value: "paternity" },
                  { label: "Emergency", value: "emergency" }, { label: "Unpaid", value: "unpaid" }] },
      { name: "start_date", label: "From Date",   type: "DATE",     isRequired: true },
      { name: "end_date",   label: "To Date",     type: "DATE",     isRequired: true },
      { name: "days",       label: "Days",        type: "NUMBER" },
      { name: "reason",     label: "Reason",      type: "TEXTAREA" },
      { name: "status",     label: "Status",      type: "STATUS",
        options: [{ label: "Pending", value: "pending", color: "#f59e0b" }, { label: "Approved", value: "approved", color: "#10b981" },
                  { label: "Rejected", value: "rejected", color: "#ef4444" }] },
    ],
  },
  {
    id: "performance_reviews",
    name: "Performance Reviews",
    icon: "⭐",
    description: "Employee evaluation and appraisal system",
    category: "hr",
    color: "#06b6d4",
    fields: [
      { name: "employee",    label: "Employee",          type: "TEXT",   isRequired: true },
      { name: "period",      label: "Review Period",     type: "TEXT" },
      { name: "reviewer",    label: "Reviewer",          type: "TEXT" },
      { name: "rating",      label: "Overall Rating",    type: "RATING" },
      { name: "goals",       label: "Goals",             type: "TEXTAREA" },
      { name: "achievements", label: "Achievements",     type: "TEXTAREA" },
      { name: "improvement", label: "Areas to Improve",  type: "TEXTAREA" },
      { name: "date",        label: "Review Date",       type: "DATE" },
    ],
  },
  // ── Finance ───────────────────────────────────────────────────────────────
  {
    id: "invoices",
    name: "Invoice Tracker",
    icon: "📄",
    description: "Create, send, and track client invoices",
    category: "finance",
    color: "#f97316",
    fields: [
      { name: "invoice_number", label: "Invoice #",     type: "TEXT",     isRequired: true },
      { name: "client",         label: "Client",        type: "TEXT",     isRequired: true },
      { name: "issue_date",     label: "Issue Date",    type: "DATE" },
      { name: "due_date",       label: "Due Date",      type: "DATE" },
      { name: "amount",         label: "Amount",        type: "CURRENCY" },
      { name: "tax",            label: "Tax (%)",       type: "DECIMAL" },
      { name: "status",         label: "Status",        type: "STATUS",
        options: [{ label: "Draft", value: "draft", color: "#6b7280" }, { label: "Sent", value: "sent", color: "#3b82f6" },
                  { label: "Paid", value: "paid", color: "#10b981" }, { label: "Overdue", value: "overdue", color: "#ef4444" },
                  { label: "Cancelled", value: "cancelled", color: "#6b7280" }] },
      { name: "notes",          label: "Notes",         type: "TEXTAREA" },
    ],
  },
  {
    id: "expenses",
    name: "Expense Reports",
    icon: "💸",
    description: "Submit, track, and approve expense claims",
    category: "finance",
    color: "#f97316",
    fields: [
      { name: "category",     label: "Category",      type: "DROPDOWN",
        options: [{ label: "Travel", value: "travel" }, { label: "Meals", value: "meals" },
                  { label: "Software", value: "software" }, { label: "Hardware", value: "hardware" },
                  { label: "Marketing", value: "marketing" }, { label: "Office", value: "office" }, { label: "Other", value: "other" }] },
      { name: "amount",       label: "Amount",        type: "CURRENCY", isRequired: true },
      { name: "date",         label: "Date",          type: "DATE",     isRequired: true },
      { name: "description",  label: "Description",   type: "TEXT" },
      { name: "submitted_by", label: "Submitted By",  type: "TEXT" },
      { name: "approved_by",  label: "Approved By",   type: "TEXT" },
      { name: "status",       label: "Status",        type: "STATUS",
        options: [{ label: "Draft", value: "draft", color: "#6b7280" }, { label: "Submitted", value: "submitted", color: "#3b82f6" },
                  { label: "Approved", value: "approved", color: "#10b981" }, { label: "Rejected", value: "rejected", color: "#ef4444" },
                  { label: "Reimbursed", value: "reimbursed", color: "#8b5cf6" }] },
    ],
  },
  {
    id: "budget_tracker",
    name: "Budget Tracker",
    icon: "📊",
    description: "Track departmental budgets and spending",
    category: "finance",
    color: "#f97316",
    fields: [
      { name: "category",    label: "Category",    type: "TEXT",     isRequired: true },
      { name: "department",  label: "Department",  type: "TEXT" },
      { name: "allocated",   label: "Allocated",   type: "CURRENCY" },
      { name: "spent",       label: "Spent",       type: "CURRENCY" },
      { name: "remaining",   label: "Remaining",   type: "CURRENCY" },
      { name: "period",      label: "Period",      type: "TEXT" },
      { name: "notes",       label: "Notes",       type: "TEXTAREA" },
    ],
  },
  // ── Inventory ─────────────────────────────────────────────────────────────
  {
    id: "products",
    name: "Product Catalog",
    icon: "📦",
    description: "Manage products, SKUs, and stock levels",
    category: "inventory",
    color: "#84cc16",
    fields: [
      { name: "product_name",  label: "Product Name",   type: "TEXT",     isRequired: true },
      { name: "sku",           label: "SKU",            type: "TEXT" },
      { name: "category",      label: "Category",       type: "TEXT" },
      { name: "price",         label: "Price",          type: "CURRENCY" },
      { name: "cost",          label: "Cost",           type: "CURRENCY" },
      { name: "quantity",      label: "Quantity",       type: "NUMBER" },
      { name: "reorder_level", label: "Reorder Level",  type: "NUMBER" },
      { name: "supplier",      label: "Supplier",       type: "TEXT" },
      { name: "description",   label: "Description",    type: "TEXTAREA" },
      { name: "status",        label: "Status",         type: "STATUS",
        options: [{ label: "Active", value: "active", color: "#10b981" }, { label: "Discontinued", value: "discontinued", color: "#ef4444" }] },
    ],
  },
  {
    id: "suppliers",
    name: "Supplier Directory",
    icon: "🏭",
    description: "Manage vendors, contacts, and payment terms",
    category: "inventory",
    color: "#84cc16",
    fields: [
      { name: "supplier_name",  label: "Supplier Name",   type: "TEXT",  isRequired: true },
      { name: "contact_person", label: "Contact Person",  type: "TEXT" },
      { name: "email",          label: "Email",           type: "EMAIL" },
      { name: "phone",          label: "Phone",           type: "PHONE" },
      { name: "address",        label: "Address",         type: "TEXTAREA" },
      { name: "payment_terms",  label: "Payment Terms",   type: "TEXT" },
      { name: "status",         label: "Status",          type: "STATUS",
        options: [{ label: "Active", value: "active", color: "#10b981" }, { label: "Inactive", value: "inactive", color: "#6b7280" }] },
    ],
  },
  {
    id: "purchase_orders",
    name: "Purchase Orders",
    icon: "🛒",
    description: "Track procurement orders from vendors",
    category: "inventory",
    color: "#84cc16",
    fields: [
      { name: "po_number",      label: "PO Number",       type: "TEXT",     isRequired: true },
      { name: "supplier",       label: "Supplier",        type: "TEXT",     isRequired: true },
      { name: "order_date",     label: "Order Date",      type: "DATE" },
      { name: "expected_date",  label: "Expected Date",   type: "DATE" },
      { name: "total_amount",   label: "Total Amount",    type: "CURRENCY" },
      { name: "status",         label: "Status",          type: "STATUS",
        options: [{ label: "Draft", value: "draft", color: "#6b7280" }, { label: "Sent", value: "sent", color: "#3b82f6" },
                  { label: "Confirmed", value: "confirmed", color: "#8b5cf6" }, { label: "Received", value: "received", color: "#10b981" },
                  { label: "Cancelled", value: "cancelled", color: "#ef4444" }] },
      { name: "notes",          label: "Notes",           type: "TEXTAREA" },
    ],
  },
];

const FIELD_TYPE_ICONS: Record<string, string> = {
  TEXT: "Aa", EMAIL: "✉", PHONE: "📞", TEXTAREA: "¶", NUMBER: "#",
  DECIMAL: "0.0", CURRENCY: "$", DATE: "📅", DATETIME: "🕐",
  DROPDOWN: "▾", STATUS: "◉", BOOLEAN: "☑", RATING: "★",
  TAGS: "🏷", FILE: "📎", IMAGE: "🖼", RICH_TEXT: "✍", MULTI_SELECT: "☰",
  USER_SELECT: "👤", PROGRESS: "%", URL: "🔗", AUTO_NUMBER: "123",
};

// ── Form Schema ────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, "Module name must be at least 2 characters"),
  description: z.string().optional(),
  icon: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Main Page ──────────────────────────────────────────────────────────────

export default function NewModulePage() {
  const router = useRouter();
  const { createModule } = useModulesStore();

  const [step, setStep] = useState<"pick" | "form">("pick");
  const [selectedTemplate, setSelectedTemplate] = useState<ModuleTemplate | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<ModuleTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { icon: "📦" },
  });

  const name = watch("name", "");
  const icon = watch("icon", "📦");

  const filteredTemplates = useMemo(() => {
    let list = TEMPLATES;
    if (activeCategory !== "all") list = list.filter(t => t.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.includes(q)
      );
    }
    return list;
  }, [activeCategory, search]);

  const previewTarget = hoveredTemplate || selectedTemplate;

  const handlePickTemplate = useCallback((tmpl: ModuleTemplate) => {
    setSelectedTemplate(tmpl);
    setValue("name", tmpl.name);
    setValue("description", tmpl.description);
    setValue("icon", tmpl.icon);
    setStep("form");
  }, [setValue]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      const mod = await createModule({ ...data, slug: slugify(data.name), order: 0 });
      if (selectedTemplate && selectedTemplate.fields.length > 0) {
        for (const field of selectedTemplate.fields) {
          try {
            await api.post(`/modules/${mod.id}/fields`, field);
          } catch {}
        }
      }
      router.push(`/studio/${mod.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create module.");
      setLoading(false);
    }
  };

  const handleStartFromScratch = () => {
    setSelectedTemplate(null);
    setValue("name", "");
    setValue("description", "");
    setValue("icon", "📦");
    setStep("form");
  };

  // ── Step: Template Picker ─────────────────────────────────────────────────

  if (step === "pick") {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/studio">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Module</h1>
            <p className="text-gray-500 text-sm">Choose a template or start from scratch.</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto gap-2" onClick={handleStartFromScratch}>
            <Sparkles className="w-4 h-4" />
            Start from Scratch
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {CATEGORIES.map(cat => {
            const count = cat.id === "all"
              ? TEMPLATES.length
              : TEMPLATES.filter(t => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                  activeCategory === cat.id
                    ? "bg-brand text-white border-brand shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-medium",
                  activeCategory === cat.id ? "bg-brand text-white" : "bg-gray-100 text-gray-500"
                )}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Main content: template grid + preview panel */}
        <div className="flex gap-5 flex-1 min-h-0 overflow-hidden">
          {/* Template Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No templates match "{search}"</p>
                <p className="text-sm mt-1">Try a different search or <button className="text-blue-600 underline" onClick={handleStartFromScratch}>start from scratch</button></p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTemplates.map(tmpl => {
                  const catInfo = CATEGORIES.find(c => c.id === tmpl.category);
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onMouseEnter={() => setHoveredTemplate(tmpl)}
                      onMouseLeave={() => setHoveredTemplate(null)}
                      onClick={() => handlePickTemplate(tmpl)}
                      className={cn(
                        "group relative text-left p-4 rounded-xl border transition-all",
                        "hover:shadow-md hover:border-brand/50 hover:-translate-y-0.5",
                        "bg-white border-gray-200"
                      )}
                    >
                      {/* Category badge */}
                      {activeCategory === "all" && catInfo && (
                        <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: catInfo.color + "22", color: catInfo.color }}>
                          {catInfo.label}
                        </span>
                      )}

                      {/* Icon */}
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-3"
                        style={{ backgroundColor: tmpl.color + "18" }}>
                        {tmpl.icon}
                      </div>

                      <h3 className="font-semibold text-gray-800 text-sm leading-tight">{tmpl.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{tmpl.description}</p>

                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {tmpl.fields.length} fields
                        </span>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 rounded-xl bg-blue-600/0 group-hover:bg-blue-600/[0.04] transition-colors pointer-events-none" />
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                          Use template <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="w-64 shrink-0 hidden xl:block">
            <div className="sticky top-0 border rounded-xl bg-gray-50 h-full max-h-[calc(100vh-16rem)] overflow-y-auto">
              {previewTarget ? (
                <div className="p-4 space-y-4">
                  {/* Template header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: previewTarget.color + "22" }}>
                      {previewTarget.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{previewTarget.name}</p>
                      <p className="text-xs text-gray-500">{previewTarget.fields.length} fields</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">{previewTarget.description}</p>

                  {/* Fields list */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fields</p>
                    <div className="space-y-1.5">
                      {previewTarget.fields.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-white border border-gray-100">
                          <span className="text-xs font-mono text-gray-400 w-6 text-center shrink-0">
                            {FIELD_TYPE_ICONS[f.type] || f.type.substring(0, 2)}
                          </span>
                          <span className="text-xs text-gray-700 flex-1 truncate">{f.label}</span>
                          {f.isRequired && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Required" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button size="sm" className="w-full gap-2" onClick={() => handlePickTemplate(previewTarget)}>
                    Use Template <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <LayoutGrid className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Hover a template</p>
                  <p className="text-xs text-gray-300 mt-1">See a preview of its fields here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Module Form ─────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep("pick")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configure Module</h1>
          <p className="text-gray-500 text-sm">Customize the name, icon, and description.</p>
        </div>
      </div>

      {/* Selected Template Banner */}
      {selectedTemplate && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: selectedTemplate.color + "22" }}>
            {selectedTemplate.icon}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm text-gray-800">{selectedTemplate.name} template selected</p>
            <p className="text-xs text-gray-500">{selectedTemplate.fields.length} fields will be added automatically</p>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 gap-1"
            onClick={() => setStep("pick")}>
            Change
          </Button>
        </div>
      )}

      {/* Module Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Module Details</CardTitle>
          <CardDescription>These can be changed later in Studio settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
            )}

            <div className="flex gap-4 items-start">
              {/* Icon */}
              <div className="shrink-0">
                <Label>Icon</Label>
                <div className="mt-1.5">
                  <IconPicker value={icon} onChange={v => setValue("icon", v)} />
                </div>
              </div>

              {/* Name */}
              <div className="flex-1 space-y-2">
                <Label htmlFor="name">Module Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Customers, Projects, Assets"
                  {...register("name")}
                  className={errors.name ? "border-red-500" : ""}
                  autoFocus
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                {name && (
                  <p className="text-xs text-gray-400">
                    URL: <span className="font-mono text-gray-600">/m/{slugify(name)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this module for? (optional)"
                rows={3}
                {...register("description")}
              />
            </div>

            {/* Template fields preview */}
            {selectedTemplate && selectedTemplate.fields.length > 0 && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Fields that will be created ({selectedTemplate.fields.length})
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {selectedTemplate.fields.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-white border border-gray-100 rounded-md px-2 py-1.5">
                      <span className="font-mono text-gray-400 w-5 text-center shrink-0">
                        {FIELD_TYPE_ICONS[f.type] || f.type.substring(0, 2)}
                      </span>
                      <span className="truncate">{f.label}</span>
                      {f.isRequired && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-auto shrink-0" />}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  All fields are fully editable after creation
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep("pick")}>
                Back
              </Button>
              <Button type="submit" disabled={loading} className="gap-2 min-w-[160px]">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {selectedTemplate?.fields.length
                      ? `Create + Add ${selectedTemplate.fields.length} Fields →`
                      : "Create Module →"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
