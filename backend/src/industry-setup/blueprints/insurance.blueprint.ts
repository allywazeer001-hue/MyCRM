import { IndustryBlueprint } from './types';

export const insuranceBlueprint: IndustryBlueprint = {
  key: 'insurance',
  industry: 'Insurance',
  description: 'Policy management, claims processing, and agent tracking',
  icon: '🛡️',
  color: '#059669',

  departments: [
    { name: 'Underwriting',      slug: 'underwriting',      color: '#3b82f6' },
    { name: 'Claims',            slug: 'claims',            color: '#ef4444' },
    { name: 'Sales & Distribution', slug: 'sales-distribution', color: '#10b981' },
    { name: 'Finance',           slug: 'ins-finance',       color: '#f59e0b' },
    { name: 'Customer Relations', slug: 'customer-relations', color: '#8b5cf6' },
  ],

  modules: [
    // 1 — policyholders (no dependencies)
    {
      name: 'Policyholders',
      slug: 'policyholders',
      icon: 'Users',
      color: '#3b82f6',
      description: 'Insured persons',
      fields: [
        {
          name: 'holder_id',
          label: 'Holder ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'PH', padLength: 5 },
        },
        { name: 'full_name',     label: 'Full Name',     type: 'TEXT', isRequired: true },
        {
          name: 'gender',
          label: 'Gender',
          type: 'DROPDOWN',
          options: [
            { label: 'Male',   value: 'male',   color: '#3b82f6' },
            { label: 'Female', value: 'female', color: '#ec4899' },
            { label: 'Other',  value: 'other',  color: '#8b5cf6' },
          ],
        },
        { name: 'date_of_birth', label: 'Date of Birth', type: 'DATE' },
        { name: 'national_id',   label: 'National ID',   type: 'TEXT' },
        { name: 'phone',         label: 'Phone',         type: 'PHONE', isRequired: true },
        { name: 'email',         label: 'Email',         type: 'EMAIL' },
        { name: 'address',       label: 'Address',       type: 'TEXTAREA' },
        { name: 'occupation',    label: 'Occupation',    type: 'TEXT' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Active',      value: 'active',      color: '#10b981' },
            { label: 'Inactive',    value: 'inactive',    color: '#94a3b8' },
            { label: 'Blacklisted', value: 'blacklisted', color: '#ef4444' },
          ],
        },
      ],
    },

    // 2 — agents (no dependencies)
    {
      name: 'Agents',
      slug: 'agents',
      icon: 'UserCheck',
      color: '#8b5cf6',
      description: 'Insurance sales agents',
      fields: [
        {
          name: 'agent_id',
          label: 'Agent ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'AGT', padLength: 5 },
        },
        { name: 'full_name',       label: 'Full Name',       type: 'TEXT',  isRequired: true },
        { name: 'license_number',  label: 'License Number',  type: 'TEXT' },
        { name: 'phone',           label: 'Phone',           type: 'PHONE', isRequired: true },
        { name: 'email',           label: 'Email',           type: 'EMAIL' },
        { name: 'commission_rate', label: 'Commission Rate (%)', type: 'NUMBER' },
        { name: 'hire_date',       label: 'Hire Date',       type: 'DATE' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Active',    value: 'active',    color: '#10b981' },
            { label: 'Inactive',  value: 'inactive',  color: '#94a3b8' },
            { label: 'Suspended', value: 'suspended', color: '#ef4444' },
          ],
        },
      ],
    },

    // 3 — policies (depends on policyholders, agents)
    {
      name: 'Policies',
      slug: 'policies',
      icon: 'FileText',
      color: '#10b981',
      description: 'Insurance policies',
      fields: [
        {
          name: 'policy_number',
          label: 'Policy Number',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'POL', padLength: 5 },
        },
        {
          name: 'policyholder',
          label: 'Policyholder',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'policyholders', displayField: 'full_name' },
        },
        {
          name: 'agent',
          label: 'Agent',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'agents', displayField: 'full_name' },
        },
        {
          name: 'policy_type',
          label: 'Policy Type',
          type: 'DROPDOWN',
          options: [
            { label: 'Life',     value: 'life',     color: '#3b82f6' },
            { label: 'Health',   value: 'health',   color: '#10b981' },
            { label: 'Motor',    value: 'motor',    color: '#f59e0b' },
            { label: 'Property', value: 'property', color: '#8b5cf6' },
            { label: 'Business', value: 'business', color: '#f97316' },
            { label: 'Travel',   value: 'travel',   color: '#0ea5e9' },
          ],
        },
        { name: 'coverage_amount',    label: 'Coverage Amount',    type: 'NUMBER', isRequired: true },
        { name: 'premium_amount',     label: 'Premium Amount',     type: 'NUMBER', isRequired: true },
        {
          name: 'premium_frequency',
          label: 'Premium Frequency',
          type: 'DROPDOWN',
          options: [
            { label: 'Monthly',   value: 'monthly',   color: '#3b82f6' },
            { label: 'Quarterly', value: 'quarterly', color: '#8b5cf6' },
            { label: 'Annually',  value: 'annually',  color: '#10b981' },
          ],
        },
        { name: 'start_date', label: 'Start Date', type: 'DATE', isRequired: true },
        { name: 'end_date',   label: 'End Date',   type: 'DATE' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Active',    value: 'active',    color: '#10b981' },
            { label: 'Lapsed',    value: 'lapsed',    color: '#f59e0b' },
            { label: 'Expired',   value: 'expired',   color: '#94a3b8' },
            { label: 'Cancelled', value: 'cancelled', color: '#ef4444' },
            { label: 'Suspended', value: 'suspended', color: '#3b82f6' },
          ],
        },
        { name: 'notes', label: 'Notes', type: 'TEXTAREA' },
      ],
    },

    // 4 — premium_payments (depends on policies, policyholders)
    {
      name: 'Premium Payments',
      slug: 'premium_payments',
      icon: 'CreditCard',
      color: '#f59e0b',
      description: 'Premium payment records',
      fields: [
        {
          name: 'payment_id',
          label: 'Payment ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'PMT', padLength: 5 },
        },
        {
          name: 'policy',
          label: 'Policy',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'policies', displayField: 'policy_number' },
        },
        {
          name: 'policyholder',
          label: 'Policyholder',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'policyholders', displayField: 'full_name' },
        },
        { name: 'amount',   label: 'Amount',   type: 'NUMBER', isRequired: true },
        { name: 'due_date', label: 'Due Date', type: 'DATE' },
        { name: 'payment_date', label: 'Payment Date', type: 'DATE' },
        {
          name: 'payment_method',
          label: 'Payment Method',
          type: 'DROPDOWN',
          options: [
            { label: 'Cash',          value: 'cash',          color: '#10b981' },
            { label: 'Bank Transfer', value: 'bank_transfer', color: '#3b82f6' },
            { label: 'Mobile Money',  value: 'mobile_money',  color: '#f59e0b' },
            { label: 'Cheque',        value: 'cheque',        color: '#8b5cf6' },
            { label: 'Direct Debit',  value: 'direct_debit',  color: '#0ea5e9' },
          ],
        },
        { name: 'reference', label: 'Reference', type: 'TEXT' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Pending', value: 'pending', color: '#f59e0b' },
            { label: 'Paid',    value: 'paid',    color: '#10b981' },
            { label: 'Overdue', value: 'overdue', color: '#ef4444' },
            { label: 'Waived',  value: 'waived',  color: '#94a3b8' },
          ],
        },
      ],
    },

    // 5 — claims (depends on policies, policyholders)
    {
      name: 'Claims',
      slug: 'claims',
      icon: 'AlertTriangle',
      color: '#ef4444',
      description: 'Insurance claims',
      fields: [
        {
          name: 'claim_id',
          label: 'Claim ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'CLM', padLength: 5 },
        },
        {
          name: 'policy',
          label: 'Policy',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'policies', displayField: 'policy_number' },
        },
        {
          name: 'policyholder',
          label: 'Policyholder',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'policyholders', displayField: 'full_name' },
        },
        { name: 'claim_type',    label: 'Claim Type',    type: 'TEXT' },
        { name: 'incident_date', label: 'Incident Date', type: 'DATE', isRequired: true },
        { name: 'claim_date',    label: 'Claim Date',    type: 'DATE', isRequired: true },
        { name: 'description',   label: 'Description',   type: 'TEXTAREA', isRequired: true },
        { name: 'claimed_amount',label: 'Claimed Amount',type: 'NUMBER',   isRequired: true },
        { name: 'documents',     label: 'Documents',     type: 'FILE' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Filed',              value: 'filed',              color: '#3b82f6' },
            { label: 'Under Assessment',   value: 'under_assessment',   color: '#f59e0b' },
            { label: 'Approved',           value: 'approved',           color: '#10b981' },
            { label: 'Partially Approved', value: 'partially_approved', color: '#84cc16' },
            { label: 'Rejected',           value: 'rejected',           color: '#ef4444' },
            { label: 'Paid',               value: 'paid',               color: '#059669' },
          ],
        },
        { name: 'notes', label: 'Notes', type: 'TEXTAREA' },
      ],
    },

    // 6 — claim_assessments (depends on claims)
    {
      name: 'Claim Assessments',
      slug: 'claim_assessments',
      icon: 'ClipboardCheck',
      color: '#6366f1',
      description: 'Claims investigation and assessment',
      fields: [
        {
          name: 'assessment_id',
          label: 'Assessment ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'ASM', padLength: 5 },
        },
        {
          name: 'claim',
          label: 'Claim',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'claims', displayField: 'claim_id' },
        },
        { name: 'assessor_name',    label: 'Assessor Name',    type: 'TEXT', isRequired: true },
        { name: 'assessment_date',  label: 'Assessment Date',  type: 'DATE', isRequired: true },
        {
          name: 'site_visit',
          label: 'Site Visit',
          type: 'DROPDOWN',
          options: [
            { label: 'Yes', value: 'yes', color: '#10b981' },
            { label: 'No',  value: 'no',  color: '#94a3b8' },
          ],
        },
        { name: 'findings',           label: 'Findings',           type: 'TEXTAREA' },
        { name: 'recommended_amount', label: 'Recommended Amount', type: 'NUMBER' },
        {
          name: 'decision',
          label: 'Decision',
          type: 'DROPDOWN',
          options: [
            { label: 'Approve Full',    value: 'approve_full',    color: '#10b981' },
            { label: 'Approve Partial', value: 'approve_partial', color: '#f59e0b' },
            { label: 'Reject',          value: 'reject',          color: '#ef4444' },
          ],
        },
        { name: 'decision_notes', label: 'Decision Notes', type: 'TEXTAREA' },
      ],
    },
  ],

  workflows: [
    {
      name: 'New Claim Filed',
      description: 'Alert claims team when a new claim is submitted',
      trigger: 'RECORD_CREATED',
      moduleSlug: 'claims',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'New Claim Filed',
            message: 'Claim @claim_id submitted by @policyholder for @claimed_amount',
          },
        },
      ],
    },
    {
      name: 'Policy Status Changed',
      description: 'Notify when a policy status is updated',
      trigger: 'FIELD_CHANGED',
      triggerConfig: { fieldName: 'status' },
      moduleSlug: 'policies',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'Policy Status Changed',
            message: 'Policy @policy_number status changed to @status',
          },
        },
      ],
    },
    {
      name: 'Premium Payment Overdue',
      description: 'Notify finance team when a premium payment becomes overdue',
      trigger: 'FIELD_CHANGED',
      moduleSlug: 'premium_payments',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'Premium Payment Overdue',
            message: 'Payment @payment_id for policy @policy is now overdue — amount: @amount',
          },
        },
      ],
    },
  ],
};
