"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLUEPRINT_LIST = exports.ALL_BLUEPRINTS = void 0;
const education_blueprint_1 = require("./education.blueprint");
const banking_blueprint_1 = require("./banking.blueprint");
const insurance_blueprint_1 = require("./insurance.blueprint");
const hospital_blueprint_1 = require("./hospital.blueprint");
const ngo_blueprint_1 = require("./ngo.blueprint");
exports.ALL_BLUEPRINTS = {
    education: education_blueprint_1.educationBlueprint,
    banking: banking_blueprint_1.bankingBlueprint,
    insurance: insurance_blueprint_1.insuranceBlueprint,
    hospital: hospital_blueprint_1.hospitalBlueprint,
    ngo: ngo_blueprint_1.ngoBlueprint,
};
exports.BLUEPRINT_LIST = Object.values(exports.ALL_BLUEPRINTS).map(bp => ({
    key: bp.key,
    industry: bp.industry,
    description: bp.description,
    icon: bp.icon,
    color: bp.color,
    moduleCount: bp.modules.length,
    workflowCount: bp.workflows.length,
    departmentCount: bp.departments.length,
    fieldCount: bp.modules.reduce((sum, m) => sum + m.fields.length, 0),
}));
//# sourceMappingURL=index.js.map