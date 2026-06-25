import { educationBlueprint } from './education.blueprint';
import { bankingBlueprint }   from './banking.blueprint';
import { insuranceBlueprint } from './insurance.blueprint';
import { hospitalBlueprint }  from './hospital.blueprint';
import { ngoBlueprint }       from './ngo.blueprint';
import { IndustryBlueprint }  from './types';

export const ALL_BLUEPRINTS: Record<string, IndustryBlueprint> = {
  education: educationBlueprint,
  banking:   bankingBlueprint,
  insurance: insuranceBlueprint,
  hospital:  hospitalBlueprint,
  ngo:       ngoBlueprint,
};

export const BLUEPRINT_LIST = Object.values(ALL_BLUEPRINTS).map(bp => ({
  key:         bp.key,
  industry:    bp.industry,
  description: bp.description,
  icon:        bp.icon,
  color:       bp.color,
  moduleCount: bp.modules.length,
  workflowCount: bp.workflows.length,
  departmentCount: bp.departments.length,
  fieldCount:  bp.modules.reduce((sum, m) => sum + m.fields.length, 0),
}));

export { IndustryBlueprint };
