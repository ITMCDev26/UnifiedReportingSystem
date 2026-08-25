/* ============================================================
   UBCC — Unified Command Center
   config.js — static fallback config.
   NOTE: At runtime the app calls API.getConfig() which pulls the
   live version of these same lists from the "Config" sheet tab,
   so the Super Admin can edit them without touching this file.
   This file is only the fallback used before the API responds
   and the shape reference for what the sheet must contain.
   ============================================================ */

const APP_CONFIG = {
  // Set this to your deployed Apps Script Web App URL (ends in /exec)
  API_URL: "https://script.google.com/macros/s/AKfycbxjLLX_CJqIUWwNEPCgom38HhBhlA_FOm78xuAOH1XWGI-s_af-tLXIxPjB9swPbIBBmQ/exec",

  orgName: "Unified Command Center",

  townships: [
    { code: "ACEA", name: "Arcovia City Estate Association, Inc." },
    { code: "BNC", name: "Boracay Newcoast Federation Inc." },
    { code: "CTAI", name: "Capital Town Association Inc." },
    { code: "CITYLINK", name: "Citylink Coach Services, Inc." },
    { code: "DPD", name: "Davao Park District Association, Inc." },
    { code: "IBPEA", name: "Iloilo Business Park Estate Association Inc." },
    { code: "MGEA", name: "Maple Grove Estate Association" },
    { code: "MTCEA", name: "McKinley Town Center Estates Association, Inc." },
    { code: "MWEA", name: "McKinley West Estate Association, Inc." },
    { code: "NCEA", name: "Newport City Estates Association, Inc." },
    { code: "NGEA", name: "Northill Gateway Estate Association" },
    { code: "SCEA", name: "Southwoods City Estate Association Inc." },
    { code: "TLC", name: "Twinlakes Corporation" },
    { code: "TMNEA", name: "The Mactan Newtown Estate Association, Inc." },
    { code: "TUEEA", name: "The Upper East Estate Association" },
    { code: "UBEA", name: "Uptown Bonifacio Estate Association, Inc." },
    { code: "WCEA", name: "Westside City Estate Association" }
  ],

  incidentTypes: [
    "Vehicular Accident", "Medical Response", "Arguments / Altercations",
    "Bomb Threat", "Crime", "Damaged to Property", "Earthquake", "Flooding",
    "House Rule Violation", "Mass Action", "Natural Calamity",
    "National Security Threat", "Fire", "Natural Hazard",
    "Power Interruption", "System/Equipment/Facility Failure",
    "Typhoon", "Water Interruption"
  ],

  // Only shown when Type of Incident === "Vehicular Accident"
  incidentClassification: [
    "Reckless Driving", "Tire Blowouts or Worn Tires", "Brake Failure",
    "Distracted Driving", "Fatigue or Drowsy Driving", "Speeding",
    "Self Vehicular Accident", "Engine Failure", "Violation of Traffic Rules",
    "Improper Signage", "Driving Under the Influence (DUI)",
    "Traffic Lights Malfunction", "Steering or Suspension Problems",
    "Improper Signage or Traffic Light Malfunctions", "Other Driver's Error"
  ],

  alertLevels: [
    { value: "Blue", label: "Blue", icon: "🔵", className: "alert-blue" },
    { value: "Yellow", label: "Yellow", icon: "🟡", className: "alert-yellow" },
    { value: "Red", label: "Red", icon: "🔴", className: "alert-red" }
  ],

  weather: [
    { value: "Sunny/Clear", icon: "☀️" },
    { value: "Cloudy", icon: "☁️" },
    { value: "Windy", icon: "🌬️" },
    { value: "Drizzle", icon: "🌦️" },
    { value: "Rain", icon: "🌧️" },
    { value: "Light Rain", icon: "🌦️" },
    { value: "Heavy Rain", icon: "⛈️" },
    { value: "Typhoon", icon: "🌀" },
    { value: "Stormy", icon: "🌩️" }
  ],

  incidentCategory: ["Facility Related", "Man Made"]
};
