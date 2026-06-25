import { IndustryBlueprint } from './types';

export const bankingBlueprint: IndustryBlueprint = {
  key: 'banking',
  industry: 'Banking & Finance',
  description: 'Customer accounts, loans, transactions, and compliance management',
  icon: '🏦',
  color: '#1d4ed8',

  departments: [
    { name: 'Retail Banking',    slug: 'retail-banking',    color: '#3b82f6' },
    { name: 'Corporate Banking', slug: 'corporate-banking', color: '#6366f1' },
    { name: 'Loans & Credit',    slug: 'loans-credit',      color: '#10b981' },
    { name: 'Customer Service',  slug: 'customer-service',  color: '#f59e0b' },
    { name: 'Compliance',        slug: 'compliance',        color: '#8b5cf6' },
    { name: 'IT & Operations',   slug: 'it-operations',     color: '#64748b' },
  ],

  modules: [
    // 1 — customers (no dependencies)
    {
      name: 'Customers',
      slug: 'customers',
      icon: 'Users',
      color: '#3b82f6',
      description: 'Bank customer profiles',
      fields: [
        {
          name: 'customer_id',
          label: 'Customer ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'CUS', padLength: 5 },
        },
        { name: 'full_name',          label: 'Full Name',          type: 'TEXT',     isRequired: true },
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
        {
          name: 'employment_status',
          label: 'Employment Status',
          type: 'DROPDOWN',
          options: [
            { label: 'Employed',      value: 'employed',      color: '#10b981' },
            { label: 'Self-Employed', value: 'self_employed', color: '#3b82f6' },
            { label: 'Student',       value: 'student',       color: '#8b5cf6' },
            { label: 'Retired',       value: 'retired',       color: '#64748b' },
            { label: 'Other',         value: 'other',         color: '#94a3b8' },
          ],
        },
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

    // 2 — accounts (depends on customers)
    {
      name: 'Accounts',
      slug: 'accounts',
      icon: 'Landmark',
      color: '#0ea5e9',
      description: 'Bank accounts',
      fields: [
        {
          name: 'account_number',
          label: 'Account Number',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'ACC', padLength: 5 },
        },
        {
          name: 'customer',
          label: 'Customer',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'customers', displayField: 'full_name' },
        },
        {
          name: 'account_type',
          label: 'Account Type',
          type: 'DROPDOWN',
          options: [
            { label: 'Savings',       value: 'savings',       color: '#10b981' },
            { label: 'Current',       value: 'current',       color: '#3b82f6' },
            { label: 'Fixed Deposit', value: 'fixed_deposit', color: '#8b5cf6' },
            { label: 'Business',      value: 'business',      color: '#f59e0b' },
          ],
        },
        { name: 'currency',      label: 'Currency',      type: 'TEXT',   defaultValue: 'TZS' },
        { name: 'balance',       label: 'Balance',       type: 'NUMBER' },
        { name: 'opening_date',  label: 'Opening Date',  type: 'DATE',   isRequired: true },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Active',  value: 'active',  color: '#10b981' },
            { label: 'Dormant', value: 'dormant', color: '#f59e0b' },
            { label: 'Closed',  value: 'closed',  color: '#94a3b8' },
            { label: 'Frozen',  value: 'frozen',  color: '#3b82f6' },
          ],
        },
      ],
    },

    // 3 — loans (depends on customers, accounts)
    {
      name: 'Loans',
      slug: 'loans',
      icon: 'HandCoins',
      color: '#f59e0b',
      description: 'Loan applications and management',
      fields: [
        {
          name: 'loan_id',
          label: 'Loan ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'LN', padLength: 5 },
        },
        {
          name: 'customer',
          label: 'Customer',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'customers', displayField: 'full_name' },
        },
        {
          name: 'account',
          label: 'Account',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'accounts', displayField: 'account_number' },
        },
        {
          name: 'loan_type',
          label: 'Loan Type',
          type: 'DROPDOWN',
          options: [
            { label: 'Personal',  value: 'personal',  color: '#3b82f6' },
            { label: 'Business',  value: 'business',  color: '#8b5cf6' },
            { label: 'Mortgage',  value: 'mortgage',  color: '#10b981' },
            { label: 'Vehicle',   value: 'vehicle',   color: '#f59e0b' },
            { label: 'Education', value: 'education', color: '#6366f1' },
          ],
        },
        { name: 'principal_amount',    label: 'Principal Amount',    type: 'NUMBER', isRequired: true },
        { name: 'interest_rate',       label: 'Interest Rate (%)',   type: 'NUMBER' },
        { name: 'tenure_months',       label: 'Tenure (Months)',     type: 'NUMBER' },
        { name: 'start_date',          label: 'Start Date',          type: 'DATE' },
        { name: 'end_date',            label: 'End Date',            type: 'DATE' },
        { name: 'monthly_installment', label: 'Monthly Installment', type: 'NUMBER' },
        { name: 'outstanding_balance', label: 'Outstanding Balance', type: 'NUMBER' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Applied',      value: 'applied',      color: '#94a3b8' },
            { label: 'Under Review', value: 'under_review', color: '#f59e0b' },
            { label: 'Approved',     value: 'approved',     color: '#3b82f6' },
            { label: 'Active',       value: 'active',       color: '#10b981' },
            { label: 'Completed',    value: 'completed',    color: '#059669' },
            { label: 'Defaulted',    value: 'defaulted',    color: '#ef4444' },
            { label: 'Rejected',     value: 'rejected',     color: '#dc2626' },
          ],
        },
        { name: 'collateral', label: 'Collateral', type: 'TEXT' },
        { name: 'notes',      label: 'Notes',      type: 'TEXTAREA' },
      ],
    },

    // 4 — transactions (depends on accounts)
    {
      name: 'Transactions',
      slug: 'transactions',
      icon: 'ArrowLeftRight',
      color: '#10b981',
      description: 'Account transactions',
      fields: [
        {
          name: 'transaction_id',
          label: 'Transaction ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'TXN', padLength: 5 },
        },
        {
          name: 'account',
          label: 'Account',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'accounts', displayField: 'account_number' },
        },
        { name: 'customer', label: 'Customer', type: 'LOOKUP', settings: { lookupModuleSlug: 'customers', displayField: 'full_name' } },
        {
          name: 'transaction_type',
          label: 'Transaction Type',
          type: 'DROPDOWN',
          options: [
            { label: 'Deposit',    value: 'deposit',    color: '#10b981' },
            { label: 'Withdrawal', value: 'withdrawal', color: '#ef4444' },
            { label: 'Transfer',   value: 'transfer',   color: '#3b82f6' },
            { label: 'Payment',    value: 'payment',    color: '#f59e0b' },
            { label: 'Fee',        value: 'fee',        color: '#94a3b8' },
          ],
        },
        { name: 'amount',           label: 'Amount',           type: 'NUMBER', isRequired: true },
        { name: 'currency',         label: 'Currency',         type: 'TEXT',   defaultValue: 'TZS' },
        { name: 'transaction_date', label: 'Transaction Date', type: 'DATE',   isRequired: true },
        { name: 'reference_number', label: 'Reference Number', type: 'TEXT' },
        { name: 'description',      label: 'Description',      type: 'TEXT' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Pending',   value: 'pending',   color: '#f59e0b' },
            { label: 'Completed', value: 'completed', color: '#10b981' },
            { label: 'Failed',    value: 'failed',    color: '#ef4444' },
            { label: 'Reversed',  value: 'reversed',  color: '#94a3b8' },
          ],
        },
        { name: 'balance_after', label: 'Balance After', type: 'NUMBER' },
      ],
    },

    // 5 — loan_repayments (depends on loans, customers)
    {
      name: 'Loan Repayments',
      slug: 'loan_repayments',
      icon: 'ReceiptText',
      color: '#6366f1',
      description: 'Loan repayment records',
      fields: [
        {
          name: 'repayment_id',
          label: 'Repayment ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'REP', padLength: 5 },
        },
        {
          name: 'loan',
          label: 'Loan',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'loans', displayField: 'loan_id' },
        },
        {
          name: 'customer',
          label: 'Customer',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'customers', displayField: 'full_name' },
        },
        { name: 'amount_paid',    label: 'Amount Paid',    type: 'NUMBER', isRequired: true },
        { name: 'payment_date',   label: 'Payment Date',   type: 'DATE',   isRequired: true },
        {
          name: 'payment_method',
          label: 'Payment Method',
          type: 'DROPDOWN',
          options: [
            { label: 'Cash',          value: 'cash',          color: '#10b981' },
            { label: 'Bank Transfer',  value: 'bank_transfer', color: '#3b82f6' },
            { label: 'Mobile Money',   value: 'mobile_money',  color: '#f59e0b' },
            { label: 'Cheque',         value: 'cheque',        color: '#8b5cf6' },
          ],
        },
        { name: 'reference',         label: 'Reference',           type: 'TEXT' },
        { name: 'outstanding_after', label: 'Outstanding After',   type: 'NUMBER' },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'On Time', value: 'on_time', color: '#10b981' },
            { label: 'Late',    value: 'late',    color: '#ef4444' },
            { label: 'Partial', value: 'partial', color: '#f59e0b' },
          ],
        },
      ],
    },

    // 6 — support_tickets (depends on customers, accounts)
    {
      name: 'Support Tickets',
      slug: 'support_tickets',
      icon: 'MessageSquareWarning',
      color: '#ef4444',
      description: 'Customer complaints and support',
      fields: [
        {
          name: 'ticket_id',
          label: 'Ticket ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'TKT', padLength: 5 },
        },
        {
          name: 'customer',
          label: 'Customer',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'customers', displayField: 'full_name' },
        },
        {
          name: 'account',
          label: 'Account',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'accounts', displayField: 'account_number' },
        },
        {
          name: 'issue_type',
          label: 'Issue Type',
          type: 'DROPDOWN',
          options: [
            { label: 'Transaction Dispute', value: 'transaction_dispute', color: '#ef4444' },
            { label: 'Account Issue',       value: 'account_issue',       color: '#f97316' },
            { label: 'Card Problem',        value: 'card_problem',        color: '#f59e0b' },
            { label: 'Loan Query',          value: 'loan_query',          color: '#3b82f6' },
            { label: 'Fraud Report',        value: 'fraud_report',        color: '#7c3aed' },
            { label: 'Other',              value: 'other',               color: '#94a3b8' },
          ],
        },
        { name: 'description', label: 'Description', type: 'TEXTAREA', isRequired: true },
        { name: 'date_raised', label: 'Date Raised', type: 'DATE',     isRequired: true },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Open',        value: 'open',        color: '#ef4444' },
            { label: 'In Progress', value: 'in_progress', color: '#f59e0b' },
            { label: 'Resolved',    value: 'resolved',    color: '#10b981' },
            { label: 'Closed',      value: 'closed',      color: '#64748b' },
            { label: 'Escalated',   value: 'escalated',   color: '#7c3aed' },
          ],
        },
        { name: 'resolution', label: 'Resolution', type: 'TEXTAREA' },
      ],
    },
  ],

  workflows: [
    {
      name: 'New Account Opened',
      description: 'Notify compliance team when a new account is opened',
      trigger: 'RECORD_CREATED',
      moduleSlug: 'accounts',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'New Account Opened',
            message: 'Account @account_number has been opened for @customer',
          },
        },
      ],
    },
    {
      name: 'Loan Application Received',
      description: 'Alert loans team on new loan applications',
      trigger: 'RECORD_CREATED',
      moduleSlug: 'loans',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'New Loan Application',
            message: 'Loan @loan_id applied by @customer for @principal_amount — type: @loan_type',
          },
        },
      ],
    },
    {
      name: 'Support Ticket Raised',
      description: 'Notify customer service team on new support tickets',
      trigger: 'RECORD_CREATED',
      moduleSlug: 'support_tickets',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'New Support Ticket',
            message: 'Ticket @ticket_id raised by @customer: @issue_type',
          },
        },
      ],
    },
  ],
};
