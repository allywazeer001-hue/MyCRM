import { IndustryBlueprint } from './types';

export const hospitalBlueprint: IndustryBlueprint = {
  key: 'hospital',
  industry: 'Healthcare / Hospital',
  description: 'Patient care, appointments, medical records, prescriptions, lab results, and billing',
  icon: '🏥',
  color: '#ef4444',

  departments: [
    { name: 'Emergency',      slug: 'emergency',       color: '#ef4444' },
    { name: 'Outpatient',     slug: 'outpatient',      color: '#3b82f6' },
    { name: 'Inpatient',      slug: 'inpatient',       color: '#8b5cf6' },
    { name: 'Surgery',        slug: 'surgery',         color: '#f97316' },
    { name: 'Pharmacy',       slug: 'pharmacy',        color: '#10b981' },
    { name: 'Laboratory',     slug: 'laboratory',      color: '#6366f1' },
    { name: 'Radiology',      slug: 'radiology',       color: '#0ea5e9' },
    { name: 'Administration', slug: 'administration',  color: '#64748b' },
  ],

  modules: [
    // ── 1. Medical Departments ────────────────────────────────────────────────
    {
      name: 'Medical Departments',
      slug: 'medical_departments',
      icon: 'Building2',
      color: '#0ea5e9',
      description: 'Hospital departments and clinical units',
      fields: [
        {
          name: 'dept_code',
          label: 'Department Code',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'DEPT', padLength: 5 },
        },
        {
          name: 'department_name',
          label: 'Department Name',
          type: 'TEXT',
          isRequired: true,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'TEXTAREA',
        },
        {
          name: 'phone',
          label: 'Phone',
          type: 'PHONE',
        },
        {
          name: 'location',
          label: 'Location / Ward',
          type: 'TEXT',
        },
      ],
    },

    // ── 2. Doctors ────────────────────────────────────────────────────────────
    {
      name: 'Doctors',
      slug: 'doctors',
      icon: 'Stethoscope',
      color: '#3b82f6',
      description: 'Medical staff and specialist records',
      fields: [
        {
          name: 'doctor_id',
          label: 'Doctor ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'DOC', padLength: 5 },
        },
        {
          name: 'full_name',
          label: 'Full Name',
          type: 'TEXT',
          isRequired: true,
        },
        {
          name: 'specialization',
          label: 'Specialization',
          type: 'TEXT',
          isRequired: true,
        },
        {
          name: 'department',
          label: 'Department',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'medical_departments', displayField: 'department_name' },
        },
        {
          name: 'license_number',
          label: 'License Number',
          type: 'TEXT',
        },
        {
          name: 'phone',
          label: 'Phone',
          type: 'PHONE',
          isRequired: true,
        },
        {
          name: 'email',
          label: 'Email',
          type: 'EMAIL',
        },
        {
          name: 'qualification',
          label: 'Qualification',
          type: 'TEXT',
        },
        {
          name: 'years_experience',
          label: 'Years of Experience',
          type: 'NUMBER',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Active',    value: 'active',    color: '#10b981' },
            { label: 'On Leave',  value: 'on_leave',  color: '#f59e0b' },
            { label: 'Resigned',  value: 'resigned',  color: '#ef4444' },
          ],
        },
        {
          name: 'bio',
          label: 'Bio',
          type: 'TEXTAREA',
        },
      ],
    },

    // ── 3. Patients ───────────────────────────────────────────────────────────
    {
      name: 'Patients',
      slug: 'patients',
      icon: 'HeartPulse',
      color: '#ef4444',
      description: 'Patient registration and profiles',
      fields: [
        {
          name: 'patient_id',
          label: 'Patient ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'PAT', padLength: 5 },
        },
        {
          name: 'first_name',
          label: 'First Name',
          type: 'TEXT',
          isRequired: true,
        },
        {
          name: 'last_name',
          label: 'Last Name',
          type: 'TEXT',
          isRequired: true,
        },
        {
          name: 'date_of_birth',
          label: 'Date of Birth',
          type: 'DATE',
        },
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
        {
          name: 'blood_type',
          label: 'Blood Type',
          type: 'DROPDOWN',
          options: [
            { label: 'A+',  value: 'a_pos',  color: '#ef4444' },
            { label: 'A-',  value: 'a_neg',  color: '#f97316' },
            { label: 'B+',  value: 'b_pos',  color: '#3b82f6' },
            { label: 'B-',  value: 'b_neg',  color: '#0ea5e9' },
            { label: 'AB+', value: 'ab_pos', color: '#8b5cf6' },
            { label: 'AB-', value: 'ab_neg', color: '#6366f1' },
            { label: 'O+',  value: 'o_pos',  color: '#10b981' },
            { label: 'O-',  value: 'o_neg',  color: '#059669' },
          ],
        },
        {
          name: 'phone',
          label: 'Phone',
          type: 'PHONE',
          isRequired: true,
        },
        {
          name: 'email',
          label: 'Email',
          type: 'EMAIL',
        },
        {
          name: 'address',
          label: 'Address',
          type: 'TEXTAREA',
        },
        {
          name: 'emergency_contact_name',
          label: 'Emergency Contact Name',
          type: 'TEXT',
        },
        {
          name: 'emergency_contact_phone',
          label: 'Emergency Contact Phone',
          type: 'PHONE',
        },
        {
          name: 'insurance_number',
          label: 'Insurance Number',
          type: 'TEXT',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Active',     value: 'active',     color: '#10b981' },
            { label: 'Discharged', value: 'discharged', color: '#64748b' },
            { label: 'Deceased',   value: 'deceased',   color: '#1e293b' },
          ],
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'TEXTAREA',
        },
        { name: 'primary_doctor', label: 'Primary Doctor', type: 'LOOKUP', settings: { lookupModuleSlug: 'doctors', displayField: 'full_name' } },
      ],
    },

    // ── 4. Appointments ───────────────────────────────────────────────────────
    {
      name: 'Appointments',
      slug: 'appointments',
      icon: 'CalendarClock',
      color: '#8b5cf6',
      description: 'Doctor-patient appointment scheduling',
      fields: [
        {
          name: 'appointment_id',
          label: 'Appointment ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'APT', padLength: 5 },
        },
        {
          name: 'patient',
          label: 'Patient',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'patients', displayField: 'first_name' },
        },
        {
          name: 'doctor',
          label: 'Doctor',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'doctors', displayField: 'full_name' },
        },
        {
          name: 'department',
          label: 'Department',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'medical_departments', displayField: 'department_name' },
        },
        {
          name: 'appointment_date',
          label: 'Appointment Date',
          type: 'DATE',
          isRequired: true,
        },
        {
          name: 'appointment_time',
          label: 'Appointment Time',
          type: 'TEXT',
          placeholder: 'e.g. 09:30 AM',
        },
        {
          name: 'reason',
          label: 'Reason for Visit',
          type: 'TEXT',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Scheduled',    value: 'scheduled',    color: '#3b82f6' },
            { label: 'Confirmed',    value: 'confirmed',    color: '#0ea5e9' },
            { label: 'In Progress',  value: 'in_progress',  color: '#f59e0b' },
            { label: 'Completed',    value: 'completed',    color: '#10b981' },
            { label: 'Cancelled',    value: 'cancelled',    color: '#ef4444' },
            { label: 'No Show',      value: 'no_show',      color: '#94a3b8' },
          ],
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'TEXTAREA',
        },
      ],
    },

    // ── 5. Medical Records ────────────────────────────────────────────────────
    {
      name: 'Medical Records',
      slug: 'medical_records',
      icon: 'FileHeart',
      color: '#10b981',
      description: 'Patient visit records, diagnoses, and treatment plans',
      fields: [
        {
          name: 'record_id',
          label: 'Record ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'MR', padLength: 5 },
        },
        {
          name: 'patient',
          label: 'Patient',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'patients', displayField: 'first_name' },
        },
        {
          name: 'doctor',
          label: 'Doctor',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'doctors', displayField: 'full_name' },
        },
        {
          name: 'visit_date',
          label: 'Visit Date',
          type: 'DATE',
          isRequired: true,
        },
        {
          name: 'chief_complaint',
          label: 'Chief Complaint',
          type: 'TEXT',
        },
        {
          name: 'diagnosis',
          label: 'Diagnosis',
          type: 'TEXTAREA',
          isRequired: true,
        },
        {
          name: 'treatment_plan',
          label: 'Treatment Plan',
          type: 'TEXTAREA',
        },
        {
          name: 'vital_signs',
          label: 'Vital Signs',
          type: 'TEXTAREA',
          placeholder: 'BP, Temperature, Pulse, Weight',
        },
        {
          name: 'follow_up_date',
          label: 'Follow-up Date',
          type: 'DATE',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Open',               value: 'open',               color: '#3b82f6' },
            { label: 'Closed',             value: 'closed',             color: '#10b981' },
            { label: 'Follow-up Required', value: 'followup_required',  color: '#f59e0b' },
          ],
        },
      ],
    },

    // ── 6. Prescriptions ──────────────────────────────────────────────────────
    {
      name: 'Prescriptions',
      slug: 'prescriptions',
      icon: 'Pill',
      color: '#f97316',
      description: 'Medication prescriptions issued to patients',
      fields: [
        {
          name: 'prescription_id',
          label: 'Prescription ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'RX', padLength: 5 },
        },
        {
          name: 'patient',
          label: 'Patient',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'patients', displayField: 'first_name' },
        },
        {
          name: 'doctor',
          label: 'Doctor',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'doctors', displayField: 'full_name' },
        },
        {
          name: 'medical_record',
          label: 'Medical Record',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'medical_records', displayField: 'record_id' },
        },
        {
          name: 'medication_name',
          label: 'Medication Name',
          type: 'TEXT',
          isRequired: true,
        },
        {
          name: 'dosage',
          label: 'Dosage',
          type: 'TEXT',
          placeholder: 'e.g. 500mg',
        },
        {
          name: 'frequency',
          label: 'Frequency',
          type: 'TEXT',
          placeholder: 'e.g. Twice daily',
        },
        {
          name: 'duration',
          label: 'Duration',
          type: 'TEXT',
          placeholder: 'e.g. 7 days',
        },
        {
          name: 'instructions',
          label: 'Instructions',
          type: 'TEXTAREA',
        },
        {
          name: 'date_prescribed',
          label: 'Date Prescribed',
          type: 'DATE',
          isRequired: true,
        },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Active',    value: 'active',    color: '#10b981' },
            { label: 'Completed', value: 'completed', color: '#64748b' },
            { label: 'Cancelled', value: 'cancelled', color: '#ef4444' },
          ],
        },
      ],
    },

    // ── 7. Lab Results ────────────────────────────────────────────────────────
    {
      name: 'Lab Results',
      slug: 'lab_results',
      icon: 'FlaskConical',
      color: '#6366f1',
      description: 'Laboratory test requests and results',
      fields: [
        {
          name: 'lab_id',
          label: 'Lab ID',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'LAB', padLength: 5 },
        },
        {
          name: 'patient',
          label: 'Patient',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'patients', displayField: 'first_name' },
        },
        {
          name: 'doctor',
          label: 'Requesting Doctor',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'doctors', displayField: 'full_name' },
        },
        {
          name: 'test_name',
          label: 'Test Name',
          type: 'TEXT',
          isRequired: true,
        },
        {
          name: 'test_date',
          label: 'Test Date',
          type: 'DATE',
          isRequired: true,
        },
        {
          name: 'results',
          label: 'Results',
          type: 'TEXTAREA',
        },
        {
          name: 'normal_range',
          label: 'Normal Range',
          type: 'TEXT',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'STATUS',
          options: [
            { label: 'Pending',   value: 'pending',   color: '#f59e0b' },
            { label: 'Completed', value: 'completed', color: '#10b981' },
            { label: 'Abnormal',  value: 'abnormal',  color: '#f97316' },
            { label: 'Critical',  value: 'critical',  color: '#ef4444' },
          ],
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'TEXTAREA',
        },
        {
          name: 'report_file',
          label: 'Report File',
          type: 'FILE',
        },
      ],
    },

    // ── 8. Patient Bills ──────────────────────────────────────────────────────
    {
      name: 'Patient Bills',
      slug: 'patient_bills',
      icon: 'ReceiptText',
      color: '#f59e0b',
      description: 'Patient invoices and payment records',
      fields: [
        {
          name: 'bill_number',
          label: 'Bill Number',
          type: 'AUTO_NUMBER',
          isUnique: true,
          settings: { prefix: 'BILL', padLength: 5 },
        },
        {
          name: 'patient',
          label: 'Patient',
          type: 'LOOKUP',
          isRequired: true,
          settings: { lookupModuleSlug: 'patients', displayField: 'first_name' },
        },
        {
          name: 'appointment',
          label: 'Appointment',
          type: 'LOOKUP',
          settings: { lookupModuleSlug: 'appointments', displayField: 'appointment_id' },
        },
        {
          name: 'bill_date',
          label: 'Bill Date',
          type: 'DATE',
          isRequired: true,
        },
        {
          name: 'service_description',
          label: 'Service Description',
          type: 'TEXTAREA',
        },
        {
          name: 'amount',
          label: 'Amount',
          type: 'NUMBER',
          isRequired: true,
        },
        {
          name: 'currency',
          label: 'Currency',
          type: 'TEXT',
          defaultValue: 'TZS',
        },
        {
          name: 'discount',
          label: 'Discount',
          type: 'NUMBER',
        },
        {
          name: 'total_amount',
          label: 'Total Amount',
          type: 'NUMBER',
        },
        {
          name: 'payment_status',
          label: 'Payment Status',
          type: 'STATUS',
          options: [
            { label: 'Unpaid',  value: 'unpaid',  color: '#ef4444' },
            { label: 'Partial', value: 'partial', color: '#f59e0b' },
            { label: 'Paid',    value: 'paid',    color: '#10b981' },
            { label: 'Waived',  value: 'waived',  color: '#6366f1' },
          ],
        },
        {
          name: 'payment_method',
          label: 'Payment Method',
          type: 'DROPDOWN',
          options: [
            { label: 'Cash',           value: 'cash',           color: '#10b981' },
            { label: 'Insurance',      value: 'insurance',      color: '#3b82f6' },
            { label: 'Bank Transfer',  value: 'bank_transfer',  color: '#8b5cf6' },
            { label: 'Mobile Money',   value: 'mobile_money',   color: '#f59e0b' },
          ],
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'TEXTAREA',
        },
      ],
    },
  ],

  workflows: [
    {
      name: 'New Patient Registered',
      description: 'Notify the registration desk when a new patient record is created',
      trigger: 'RECORD_CREATED',
      moduleSlug: 'patients',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'New Patient Registered',
            message: 'Patient @first_name @last_name (ID: @patient_id) has been registered.',
          },
        },
      ],
    },
    {
      name: 'Appointment Scheduled',
      description: 'Alert the assigned doctor when a new appointment is booked',
      trigger: 'RECORD_CREATED',
      moduleSlug: 'appointments',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'New Appointment Booked',
            message: 'Appointment @appointment_id has been scheduled for @appointment_date. Please review.',
          },
        },
      ],
    },
    {
      name: 'Lab Result Status Changed',
      description: 'Notify doctor and patient team when a lab result status changes (e.g. Critical or Completed)',
      trigger: 'FIELD_CHANGED',
      triggerConfig: { fieldName: 'status' },
      moduleSlug: 'lab_results',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'Lab Result Updated',
            message: 'Lab test @test_name (ID: @lab_id) status is now "@status". Please review the results.',
          },
        },
      ],
    },
    {
      name: 'Bill Payment Status Changed',
      description: 'Alert finance team when a patient bill payment status is updated',
      trigger: 'FIELD_CHANGED',
      triggerConfig: { fieldName: 'payment_status' },
      moduleSlug: 'patient_bills',
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          order: 0,
          config: {
            title: 'Bill Payment Updated',
            message: 'Bill @bill_number payment status changed to "@payment_status". Amount: @total_amount @currency.',
          },
        },
      ],
    },
  ],
};
