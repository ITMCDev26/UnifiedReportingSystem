/* ============================================================
   formSchemas.js — declarative field lists for each report type.
   forms.js reads these to render inputs, so adding/removing a
   field only requires editing this file.
   ============================================================ */

const FIELD_LIBRARY = {
  typeOfIncident: {
    key: "typeOfIncident", label: "Type of Incident", type: "select",
    optionsFrom: "incidentTypes", required: true
  },
  incidentClassification: {
    key: "incidentClassification", label: "Incident Classification", type: "select",
    optionsFrom: "incidentClassification", required: true,
    showIf: { field: "typeOfIncident", equals: "Vehicular Accident" }
  },
  alertLevel: {
    key: "alertLevel", label: "Alert Level", type: "icon-choice",
    optionsFrom: "alertLevels", required: true
  },
  township: {
    key: "township", label: "Township", type: "township-carousel", required: true
  },
  location: { key: "location", label: "Location", type: "text", required: true },
  landmark: { key: "landmark", label: "Landmark", type: "text", required: false },
  date: { key: "date", label: "Date", type: "date", required: true },
  timeOfIncident: { key: "timeOfIncident", label: "Time of Incident", type: "time", required: true },
  timeOfResponse: { key: "timeOfResponse", label: "Time of Response", type: "time", required: false },
  weather: { key: "weather", label: "Weather", type: "icon-choice", optionsFrom: "weather", required: true },
  incidentCategory: {
    key: "incidentCategory", label: "Incident Category", type: "select",
    optionsFrom: "incidentCategory", required: false
  },
  mapPin: { key: "mapPin", label: "Google Map Pin (link or coordinates)", type: "text", required: false },
  magnitude: { key: "magnitude", label: "Magnitude (Natural Category)", type: "text", required: false },
  casualties: { key: "casualties", label: "Casualties / Victims", type: "text", required: false },
  equipmentDetails: { key: "equipmentDetails", label: "Equipment / Facility / System Details", type: "text", required: false },
  propertyDamage: { key: "propertyDamage", label: "Property Damage", type: "text", required: false },
  financialImpact: { key: "financialImpact", label: "Financial Impact", type: "text", required: false },
  narrative: { key: "narrative", label: "Narrative of the Incident", type: "textarea", required: true },
  actionTaken: { key: "actionTaken", label: "Action Taken", type: "textarea", required: true },
  remarks: { key: "remarks", label: "Remarks", type: "textarea", required: false },
  resolved: {
    key: "resolved", label: "Is the Incident Already Resolved?", type: "yesno", required: true
  },
  respondingPersonnel: { key: "respondingPersonnel", label: "Responding Personnel", type: "textarea", required: true },
  // Locked to the logged-in operator's own name on file — never a free
  // text field. The backend enforces this too (it overwrites reportedBy
  // with the session's name on every save), so this is not just a UI
  // nicety, it can't be spoofed by editing the form.
  reportedBy: { key: "reportedBy", label: "Reported By", type: "readonly", required: true }
};

const FORM_SCHEMAS = {
  initial: [
    "typeOfIncident", "incidentClassification", "alertLevel", "township",
    "location", "landmark", "date", "timeOfIncident", "weather",
    "casualties", "narrative", "actionTaken", "remarks",
    "respondingPersonnel", "reportedBy"
  ],
  progress: [
    "typeOfIncident", "incidentClassification", "alertLevel", "township",
    "location", "landmark", "weather", "date", "timeOfIncident", "timeOfResponse",
    "incidentCategory", "mapPin", "magnitude", "casualties", "equipmentDetails",
    "propertyDamage", "financialImpact", "narrative", "actionTaken", "remarks",
    "resolved", "respondingPersonnel", "reportedBy"
  ],
  information: [
    "typeOfIncident", "incidentClassification", "alertLevel", "township",
    "location", "landmark", "weather", "date", "timeOfIncident", "timeOfResponse",
    "incidentCategory", "mapPin", "magnitude", "casualties", "equipmentDetails",
    "propertyDamage", "financialImpact", "narrative", "actionTaken", "remarks",
    "resolved", "respondingPersonnel", "reportedBy"
  ]
};

// Fields copied over automatically when "New Progress Report" is launched
// from an Initial Report record (autofill).
const CARRY_FROM_INITIAL_TO_PROGRESS = [
  "typeOfIncident", "incidentClassification", "alertLevel", "township",
  "location", "landmark", "weather", "date", "timeOfIncident",
  "casualties", "narrative", "actionTaken", "respondingPersonnel"
];

// Fields copied over when a follow-up series (-2, -3 ...) is started on an
// existing Progress or Information report.
// Note: reportedBy is intentionally NOT carried forward — it's always the
// operator who is filing THIS particular follow-up/progress entry, not
// whoever filed the original record.
const CARRY_FROM_PREVIOUS_SERIES = [
  "typeOfIncident", "incidentClassification", "alertLevel", "township",
  "location", "landmark", "incidentCategory"
];
