import { IndustryBlueprint } from './types';

export const ngoBlueprint: IndustryBlueprint = {
  key: 'ngo',
  industry: 'NGO / Non-Profit',
  description: 'Beneficiary management, donor tracking, programs, and grants',
  icon: '🤝',
  color: '#ec4899',

  departments: [
    { name: 'Programs',                    slug: 'programs',     color: '#8b5cf6' },
    { name: 'Finance',                     slug: 'ngo-finance',  color: '#f59e0b' },
    { name: 'M&E (Monitoring & Evaluation)', slug: 'me',         color: '#3b82f6' },
    { name: 'Community Outreach',          slug: 'outreach',     color: '#10b981' },
    { name: 'Administration',              slug: 'admin',        color: '#64748b' },
  ],

  modules: [
    // 1 — donors (no dependencies)
    {
      name: 'Donors',
      slug: 'donors',
      icon: 'HandHeart',
      color: '#f59e0b',
      description: 'Individual and organizational donors',
      fields: [
        {
          name: 'donor_id',
          label: 'Donor ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'DNR', padLength: 5 },
        },
        { name: 'full_name', label: 'Full Name', type: 'TEXT', isRequired: true },
        {
          name: 'donor_type',
          label: 'Donor Type',
          type: 'DROPDOWN',
          options: [
            { label: 'Individual',  value: 'individual',  color: '#3b82f6' },
            { label: 'Corporate',   value: 'corporate',   color: '#8b5cf6' },
            { label: 'Foundation',  value: 'foundation',  color: '#10b981' },
            { label: 'Government',  value: 'government',  color: '#64748b' },
          ],
        },
        { name: 'phone',   label: 'Phone',   type: 'PHONE' },
        { name: 'email',   label: 'Email',   type: 'EMAIL', isRequired: true },
        { name: 'address', label: 'Address', type: 'TEXTAREA' },
        { name: 'country', label: 'Country', type: 'TEXT' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Active',    value: 'active',    color: '#10b981' },
            { label: 'Inactive',  value: 'inactive',  color: '#94a3b8' },
            { label: 'Anonymous', value: 'anonymous', color: '#64748b' },
          ],
        },
      ],
    },

    // 2 — programs (no dependencies)
    {
      name: 'Programs',
      slug: 'programs',
      icon: 'Target',
      color: '#8b5cf6',
      description: 'NGO programs and initiatives',
      fields: [
        {
          name: 'program_id',
          label: 'Program ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'PRG', padLength: 5 },
        },
        { name: 'program_name', label: 'Program Name', type: 'TEXT',     isRequired: true },
        { name: 'description',  label: 'Description',  type: 'TEXTAREA' },
        { name: 'start_date',   label: 'Start Date',   type: 'DATE' },
        { name: 'end_date',     label: 'End Date',     type: 'DATE' },
        { name: 'target_beneficiaries', label: 'Target Beneficiaries', type: 'NUMBER' },
        { name: 'budget',       label: 'Budget',       type: 'NUMBER' },
        { name: 'currency',     label: 'Currency',     type: 'TEXT', defaultValue: 'TZS' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Planning',   value: 'planning',   color: '#f59e0b' },
            { label: 'Active',     value: 'active',     color: '#10b981' },
            { label: 'Completed',  value: 'completed',  color: '#3b82f6' },
            { label: 'Suspended',  value: 'suspended',  color: '#ef4444' },
          ],
        },
      ],
    },

    // 3 — projects (depends on programs)
    {
      name: 'Projects',
      slug: 'projects',
      icon: 'Briefcase',
      color: '#3b82f6',
      description: 'Projects under programs',
      fields: [
        {
          name: 'project_id',
          label: 'Project ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'PRJ', padLength: 5 },
        },
        { name: 'project_name', label: 'Project Name', type: 'TEXT', isRequired: true },
        {
          name: 'program',
          label: 'Program',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'programs', displayField: 'program_name' },
        },
        { name: 'location',         label: 'Location',         type: 'TEXT' },
        { name: 'start_date',       label: 'Start Date',       type: 'DATE', isRequired: true },
        { name: 'end_date',         label: 'End Date',         type: 'DATE' },
        { name: 'budget',           label: 'Budget',           type: 'NUMBER' },
        { name: 'currency',         label: 'Currency',         type: 'TEXT', defaultValue: 'TZS' },
        { name: 'project_manager',  label: 'Project Manager',  type: 'TEXT' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Planning',   value: 'planning',   color: '#f59e0b' },
            { label: 'Active',     value: 'active',     color: '#10b981' },
            { label: 'Completed',  value: 'completed',  color: '#3b82f6' },
            { label: 'On Hold',    value: 'on_hold',    color: '#f97316' },
            { label: 'Cancelled',  value: 'cancelled',  color: '#ef4444' },
          ],
        },
        { name: 'description', label: 'Description', type: 'TEXTAREA' },
      ],
    },

    // 4 — beneficiaries (depends on programs)
    {
      name: 'Beneficiaries',
      slug: 'beneficiaries',
      icon: 'Heart',
      color: '#ec4899',
      description: 'People served by the NGO',
      fields: [
        {
          name: 'beneficiary_id',
          label: 'Beneficiary ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'BNF', padLength: 5 },
        },
        { name: 'full_name', label: 'Full Name', type: 'TEXT', isRequired: true },
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
        { name: 'phone',         label: 'Phone',         type: 'PHONE' },
        { name: 'address',       label: 'Address',       type: 'TEXTAREA' },
        {
          name: 'program',
          label: 'Program',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'programs', displayField: 'program_name' },
        },
        { name: 'project', label: 'Project', type: 'LOOKUP', settings: { lookupModuleSlug: 'projects', displayField: 'project_name' } },
        {
          name: 'vulnerability_category',
          label: 'Vulnerability Category',
          type: 'DROPDOWN',
          options: [
            { label: 'Orphan',   value: 'orphan',   color: '#ef4444' },
            { label: 'Widow',    value: 'widow',    color: '#f97316' },
            { label: 'Disabled', value: 'disabled', color: '#f59e0b' },
            { label: 'Elderly',  value: 'elderly',  color: '#84cc16' },
            { label: 'Refugee',  value: 'refugee',  color: '#3b82f6' },
            { label: 'Child',    value: 'child',    color: '#8b5cf6' },
            { label: 'Other',    value: 'other',    color: '#94a3b8' },
          ],
        },
        { name: 'registration_date', label: 'Registration Date', type: 'DATE' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Active',    value: 'active',    color: '#10b981' },
            { label: 'Graduated', value: 'graduated', color: '#3b82f6' },
            { label: 'Inactive',  value: 'inactive',  color: '#94a3b8' },
            { label: 'Deceased',  value: 'deceased',  color: '#64748b' },
          ],
        },
      ],
    },

    // 5 — donations (depends on donors, programs)
    {
      name: 'Donations',
      slug: 'donations',
      icon: 'DollarSign',
      color: '#10b981',
      description: 'Donation records',
      fields: [
        {
          name: 'donation_id',
          label: 'Donation ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'DON', padLength: 5 },
        },
        {
          name: 'donor',
          label: 'Donor',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'donors', displayField: 'full_name' },
        },
        {
          name: 'program',
          label: 'Program',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'programs', displayField: 'program_name' },
        },
        { name: 'amount',        label: 'Amount',        type: 'NUMBER', isRequired: true },
        { name: 'currency',      label: 'Currency',      type: 'TEXT',   defaultValue: 'TZS' },
        { name: 'donation_date', label: 'Donation Date', type: 'DATE',   isRequired: true },
        {
          name: 'payment_method',
          label: 'Payment Method',
          type: 'DROPDOWN',
          options: [
            { label: 'Cash',          value: 'cash',          color: '#10b981' },
            { label: 'Bank Transfer', value: 'bank_transfer', color: '#3b82f6' },
            { label: 'Online',        value: 'online',        color: '#0ea5e9' },
            { label: 'Mobile Money',  value: 'mobile_money',  color: '#f59e0b' },
            { label: 'Cheque',        value: 'cheque',        color: '#8b5cf6' },
            { label: 'In-Kind',       value: 'in_kind',       color: '#94a3b8' },
          ],
        },
        { name: 'reference', label: 'Reference', type: 'TEXT' },
        { name: 'purpose',   label: 'Purpose',   type: 'TEXT' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Pledged',     value: 'pledged',     color: '#94a3b8' },
            { label: 'Received',    value: 'received',    color: '#10b981' },
            { label: 'Acknowledged',value: 'acknowledged',color: '#3b82f6' },
            { label: 'Allocated',   value: 'allocated',   color: '#8b5cf6' },
          ],
        },
        { name: 'notes', label: 'Notes', type: 'TEXTAREA' },
      ],
    },

    // 6 — expenses (depends on projects)
    {
      name: 'Expenses',
      slug: 'expenses',
      icon: 'Receipt',
      color: '#f97316',
      description: 'Project expense tracking',
      fields: [
        {
          name: 'expense_id',
          label: 'Expense ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'EXP', padLength: 5 },
        },
        {
          name: 'project',
          label: 'Project',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'projects', displayField: 'project_name' },
        },
        { name: 'donor', label: 'Donor / Funder', type: 'LOOKUP', settings: { lookupModuleSlug: 'donors', displayField: 'full_name' } },
        {
          name: 'expense_category',
          label: 'Expense Category',
          type: 'DROPDOWN',
          options: [
            { label: 'Staff',        value: 'staff',        color: '#3b82f6' },
            { label: 'Transport',    value: 'transport',    color: '#f59e0b' },
            { label: 'Equipment',    value: 'equipment',    color: '#8b5cf6' },
            { label: 'Training',     value: 'training',     color: '#10b981' },
            { label: 'Food',         value: 'food',         color: '#f97316' },
            { label: 'Construction', value: 'construction', color: '#64748b' },
            { label: 'Other',        value: 'other',        color: '#94a3b8' },
          ],
        },
        { name: 'description',  label: 'Description',  type: 'TEXT',   isRequired: true },
        { name: 'amount',       label: 'Amount',       type: 'NUMBER', isRequired: true },
        { name: 'currency',     label: 'Currency',     type: 'TEXT',   defaultValue: 'TZS' },
        { name: 'expense_date', label: 'Expense Date', type: 'DATE',   isRequired: true },
        { name: 'paid_to',     label: 'Paid To',      type: 'TEXT' },
        { name: 'receipt',     label: 'Receipt',      type: 'FILE' },
        { name: 'approved_by', label: 'Approved By',  type: 'TEXT' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Pending',  value: 'pending',  color: '#f59e0b' },
            { label: 'Approved', value: 'approved', color: '#10b981' },
            { label: 'Rejected', value: 'rejected', color: '#ef4444' },
            { label: 'Paid',     value: 'paid',     color: '#059669' },
          ],
        },
      ],
    },

    // 7 — volunteers (depends on programs)
    {
      name: 'Volunteers',
      slug: 'volunteers',
      icon: 'UserCog',
      color: '#6366f1',
      description: 'Volunteer management',
      fields: [
        {
          name: 'volunteer_id',
          label: 'Volunteer ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'VOL', padLength: 5 },
        },
        { name: 'full_name', label: 'Full Name', type: 'TEXT',  isRequired: true },
        { name: 'phone',     label: 'Phone',     type: 'PHONE', isRequired: true },
        { name: 'email',     label: 'Email',     type: 'EMAIL' },
        { name: 'skills',    label: 'Skills',    type: 'TEXT' },
        {
          name: 'availability',
          label: 'Availability',
          type: 'DROPDOWN',
          options: [
            { label: 'Full Time', value: 'full_time', color: '#10b981' },
            { label: 'Part Time', value: 'part_time', color: '#3b82f6' },
            { label: 'Weekends',  value: 'weekends',  color: '#f59e0b' },
            { label: 'On Call',   value: 'on_call',   color: '#8b5cf6' },
          ],
        },
        {
          name: 'program',
          label: 'Program',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'programs', displayField: 'program_name' },
        },
        { name: 'start_date', label: 'Start Date', type: 'DATE' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Active',   value: 'active',   color: '#10b981' },
            { label: 'Inactive', value: 'inactive', color: '#94a3b8' },
            { label: 'On Hold',  value: 'on_hold',  color: '#f59e0b' },
          ],
        },
        { name: 'notes', label: 'Notes', type: 'TEXTAREA' },
      ],
    },
  ],

  workflows: [
    {
      name: 'New Donation Received',
      description: 'Notify finance team when a donation is received',
      trigger: 'RECORD_CREATED',
      moduleSlug: 'donations',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'New Donation Received',
            message: 'Donation @donation_id received from @donor — amount: @amount @currency',
          },
        },
      ],
    },
    {
      name: 'New Beneficiary Registered',
      description: 'Notify programs team when a beneficiary is registered',
      trigger: 'RECORD_CREATED',
      moduleSlug: 'beneficiaries',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'New Beneficiary Registered',
            message: '@full_name (ID: @beneficiary_id) enrolled in program @program',
          },
        },
      ],
    },
    {
      name: 'Expense Submitted for Approval',
      description: 'Notify admin when a project expense is submitted',
      trigger: 'RECORD_CREATED',
      moduleSlug: 'expenses',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'Expense Submitted',
            message: 'Expense @expense_id for @amount @currency submitted for project @project — category: @expense_category',
          },
        },
      ],
    },
  ],
};
