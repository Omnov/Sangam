require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");

const Issue = require("./src/models/Issue");
const User = require("./src/models/User");

async function runSeed() {
  try {
    await connectDB();
    console.log("Connected to MongoDB Atlas.");

    let dummyUser = await User.findOne({ email: "citizen.demo@sangam.gov.in" });
    if (!dummyUser) {
      dummyUser = await User.create({
        name: "Jharkhand Citizen Collective",
        email: "citizen.demo@sangam.gov.in",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwx1234567890abcdefghijklmnopqrst",
        role: "citizen",
        district: "Ranchi"
      });
    }

    const userId = dummyUser._id;

    const challengesRaw = [
      // Water & Sanitation
      {
        title: "Clean Drinking Water Monitoring Network",
        description: "Deploying low-cost IoT turbidity and heavy metal sensors across rural deep-bore wells to detect runoff from active mining zones.",
        sector: "Water & Sanitation",
        theme: "Public Health",
        district: "Ranchi"
      },
      {
        title: "Fluoride Remediation Micro-Filters for Tube Wells",
        description: "Community-scale adsorption filter units to neutralize high fluoride concentrations in groundwater aquifers.",
        sector: "Water & Sanitation",
        theme: "Clean Water",
        district: "Palamu"
      },
      {
        title: "Arsenic Detection Field Test Strips and Mapping",
        description: "Equipping rural health animators with digital colorimetric strips to geolocate arsenic-contaminated handpumps.",
        sector: "Water & Sanitation",
        theme: "Environmental Health",
        district: "Sahebganj"
      },
      {
        title: "Subarnarekha River Runoff Quality Mesh",
        description: "Solar-powered floating sensor buoys monitoring pH, dissolved oxygen, and industrial effluents near industrial discharge nodes.",
        sector: "Water & Sanitation",
        theme: "River Ecology",
        district: "East Singhbhum"
      },
      {
        title: "Check Dam Siltation Early Warning System",
        description: "Ultrasonic depth gauge mesh alerting watershed committees when reservoir beds lose capacity prior to monsoons.",
        sector: "Water & Sanitation",
        theme: "Water Conservation",
        district: "Gumla"
      },
      {
        title: "Decentralized Greywater Recycling in Peri-Urban Basti Clusters",
        description: "Constructed reed-bed phytoremediation systems to treat bathing water for kitchen garden irrigation.",
        sector: "Water & Sanitation",
        theme: "Circular Water",
        district: "Dhanbad"
      },

      // Agriculture & Rural Tech
      {
        title: "Solar Cold Storage for Mahua & Lac Forest Produce",
        description: "Decentralized solar micro-chambers to prevent humidity spoilage of seasonal forest harvests in tribal cooperative hubs.",
        sector: "Agriculture",
        theme: "Tribal Livelihood",
        district: "Khunti"
      },
      {
        title: "Low-Cost Soil Micronutrient & Zinc Scanner",
        description: "Handheld optical spectrophotometers for agricultural volunteers providing instant fertilizer recommendations.",
        sector: "Agriculture",
        theme: "Agritech",
        district: "Hazaribagh"
      },
      {
        title: "Solar Drip Irrigation Controllers for Plateau Terraces",
        description: "Low-pressure drip systems powered by portable 1HP solar pumps for undulating vegetable plots.",
        sector: "Agriculture",
        theme: "Sustainable Irrigation",
        district: "Lohardaga"
      },
      {
        title: "Finger Millet (Ragi) Threshing and De-husking Machinery",
        description: "Ergonomic, low-vibration electric decorticators to cut manual processing fatigue for women-led SHGs.",
        sector: "Agriculture",
        theme: "Farm Mechanization",
        district: "Simdega"
      },
      {
        title: "Tasar Silk Cocoon Hot-Air Desiccation Chambers",
        description: "Temperature-controlled curing boxes replacing smoky open fires to protect delicate silk yarn tensile strength.",
        sector: "Agriculture",
        theme: "Sericulture",
        district: "Saraikela Kharsawan"
      },
      {
        title: "Automated Pest Acoustic Trap for Pigeonpea Pod Borers",
        description: "Bioacoustic sensor modules alerting pulses cooperatives of larval infestations before visible crop ruin.",
        sector: "Agriculture",
        theme: "Pest Management",
        district: "Garhwa"
      },
      {
        title: "Community Seed Vaults with Humidity Regulators",
        description: "Sealed storage silos maintaining indigenous drought-hardy rice varieties without chemical fumigants.",
        sector: "Agriculture",
        theme: "Biodiversity Preservation",
        district: "West Singhbhum"
      },
      {
        title: "Mushroom Spawn Temperature-Controlled Grow Bags",
        description: "Low-wattage peltier heating pouches allowing year-round oyster mushroom incubation in uninsulated mud homes.",
        sector: "Agriculture",
        theme: "Allied Agriculture",
        district: "Bokaro"
      },

      // Healthcare
      {
        title: "Offline AI Pediatric Triage for Remote Anganwadis",
        description: "Localized, Hindi/Santhali edge vision models on low-cost tablets screening infant malnutrition and stunting signs.",
        sector: "Healthcare",
        theme: "Smart Health",
        district: "Dhanbad"
      },
      {
        title: "Sickle Cell Anemia Rapid Screen Kits for Tribal Schools",
        description: "Microfluidic cartridges delivering point-of-care hemoglobinopathy electrophoresis in 10 minutes.",
        sector: "Healthcare",
        theme: "Preventive Genetics",
        district: "Pakur"
      },
      {
        title: "Cold Chain Vaccine Carrier for Off-Road Terrain",
        description: "Phase-change material vaccine boxes maintaining 2–8°C for 48 hours without active grid recharge on two-wheelers.",
        sector: "Healthcare",
        theme: "Immunization Logistics",
        district: "Latehar"
      },
      {
        title: "Snakebite Antivenom Drone Rapid Dispatch Network",
        description: "Autonomous quadcopter routing between district hospitals and forested primary health centers during peak monsoons.",
        sector: "Healthcare",
        theme: "Emergency Logistics",
        district: "Chatra"
      },
      {
        title: "Silicosis Mobile Radiography Screening Van",
        description: "Chest X-ray vans equipped with AI bone-suppression software screening stone-crusher and quarry laborers.",
        sector: "Healthcare",
        theme: "Occupational Health",
        district: "Koderma"
      },
      {
        title: "Tele-Sonography Kit for Sub-Divisional Maternity Clinics",
        description: "Ultraportable ultrasound probes transmitting encrypted fetal scans to obstetrics faculty in capital hospitals.",
        sector: "Healthcare",
        theme: "Maternal Care",
        district: "Deoghar"
      },
      {
        title: "Waterborne Diarrhea Outbreak Predictor Model",
        description: "Machine learning alert dashboard synthesizing pharmacy rehydration sales and water quality incidents.",
        sector: "Healthcare",
        theme: "Epidemiological Surveillance",
        district: "Giridih"
      },

      // Urban Infrastructure & Mobility
      {
        title: "Monsoon Pothole & Road Cave-in Geospatial Reporter",
        description: "Citizen dashboard extracting GPS coordinates and dimensions from photos to accelerate municipal repairs.",
        sector: "Infrastructure",
        theme: "Urban Tech",
        district: "East Singhbhum"
      },
      {
        title: "Smart Streetlighting with Ambient Dimming",
        description: "Mesh-connected LED controllers lowering brightness along suburban corridors while maintaining safety foot-candles.",
        sector: "Infrastructure",
        theme: "Energy Efficiency",
        district: "Ranchi"
      },
      {
        title: "Coal Hauler Weighbridge Thermal Scanner",
        description: "Automated infrared cameras checking axle heat and brake temperatures of freight trucks before entering town bypasses.",
        sector: "Infrastructure",
        theme: "Road Safety",
        district: "Ramgarh"
      },
      {
        title: "Pedestrian Subway Waterlogging Ingress Sensors",
        description: "Submersible pump actuators triggering automatically when stormwater crosses warning thresholds.",
        sector: "Infrastructure",
        theme: "Disaster Mitigation",
        district: "Bokaro"
      },
      {
        title: "Electric Auto-Rickshaw Solar Swapping Stations",
        description: "Community-shared battery charging lockers fed by rooftop arrays along high-traffic suburban passenger routes.",
        sector: "Infrastructure",
        theme: "Clean Transit",
        district: "Dhanbad"
      },

      // Energy & Environment
      {
        title: "Micro-Hydro Turbine Grid for Hilly Forest Hamlets",
        description: "Community-maintained pico-hydro turbines leveraging perennial hill streams to power grain threshers and night lights.",
        sector: "Energy",
        theme: "Renewable Energy",
        district: "West Singhbhum"
      },
      {
        title: "Automated Air Quality Warning Mesh near Industrial Belts",
        description: "Particulate matter warning sirens and public LED indicators outside steel processing clusters.",
        sector: "Environment",
        theme: "Ecological Safety",
        district: "Bokaro"
      },
      {
        title: "Abandoned Open-Cast Mine Methane Vent Capture",
        description: "Low-pressure biogas bladders harvesting fugitive coal seam gas from legacy mine shafts for cooking fuel.",
        sector: "Energy",
        theme: "Methane Abatement",
        district: "Jamtara"
      },
      {
        title: "Fly Ash Concrete Paver Block Manufacturing Units",
        description: "Hydraulic press dies using 70% thermal power fly ash to fabricate permeable road pavers for rural lanes.",
        sector: "Environment",
        theme: "Waste Valorization",
        district: "Bokaro"
      },
      {
        title: "Biomass Pelletizer for Sal Leaf & Forest Litter",
        description: "Dry-shredding and pellet presses converting combustible woodland debris into smokeless cookstove fuel.",
        sector: "Energy",
        theme: "Biofuels",
        district: "Khunti"
      },
      {
        title: "Mine Tailings Pond Overtopping Early Warning",
        description: "Radar surface altimeters tracking embankment silt levels to prevent slurry breeches into irrigation canals.",
        sector: "Environment",
        theme: "Mining Safety",
        district: "East Singhbhum"
      },
      {
        title: "Elephant Migration Corridor Acoustic Alert Fences",
        description: "Seismic and acoustic perimeter nodes triggering yellow strobe lights along village borders to prevent conflict.",
        sector: "Environment",
        theme: "Wildlife Protection",
        district: "Saraikela Kharsawan"
      },

      // Education & Digital Inclusion
      {
        title: "Santhali & Mundari Digital Literacy Audio-Kit",
        description: "Voice-first flash cards bridging early school reading gaps in native tribal dialects using interactive local folklore.",
        sector: "Education",
        theme: "EdTech",
        district: "Dumka"
      },
      {
        title: "Solar Raspberry-Pi Offline Digital Libraries",
        description: "Self-contained Wi-Fi intranet hotspots providing Wikipedia, NCERT textbooks, and coding tutorials to off-grid schools.",
        sector: "Education",
        theme: "Digital Divide",
        district: "Simdega"
      },
      {
        title: "STEM Tinkering Labs Built from Salvaged Electronic Waste",
        description: "Modular curricula teaching high schoolers circuit assembly using capacitors and motors desoldered from discarded TVs.",
        sector: "Education",
        theme: "Hands-on STEM",
        district: "Ranchi"
      },
      {
        title: "Mobile Astronomy Planetarium for Rural High Schools",
        description: "Inflatable geodesic domes with low-cost digital projectors touring block-level Kasturba Gandhi Balika Vidyalayas.",
        sector: "Education",
        theme: "Scientific Temperament",
        district: "Godda"
      },
      {
        title: "AI Spoken English Tutor with Regional Accent Tolerance",
        description: "Lightweight conversational agent assisting rural polytechnic graduates with vocational interview prep.",
        sector: "Education",
        theme: "Employability",
        district: "Hazaribagh"
      },

      // Governance, Civic Tech & Artisan Livelihood
      {
        title: "Kharwar & Sohrai Murals Augmented Reality Archive",
        description: "Photogrammetry library enabling tribal artisan cooperatives to authenticate authentic mud mural prints with NFC tags.",
        sector: "Livelihood",
        theme: "Artisan Heritage",
        district: "Hazaribagh"
      },
      {
        title: "Bamboo Craft Vacuum Pressure Impregnation Cylinders",
        description: "Low-cost boric acid treatment vats protecting hand-woven bamboo baskets from termite decay.",
        sector: "Livelihood",
        theme: "Craft Innovation",
        district: "Dumka"
      },
      {
        title: "Public Distribution System (PDS) Grain Weighing Validator",
        description: "Tamper-evident bluetooth scales transmitting exact ration dispensation weights directly to family ration card SMS.",
        sector: "Governance",
        theme: "Transparency",
        district: "Palamu"
      },
      {
        title: "Forest Rights Act (FRA) Patta Geospatial Boundary Mapper",
        description: "Offline mobile GIS tool helping Gram Sabhas map ancestral community forest resource borders.",
        sector: "Governance",
        theme: "Civic Rights",
        district: "Latehar"
      },
      {
        title: "Rural Haat Price Ticker and Demand Forecaster",
        description: "Simple IVR phone system where vegetable growers check morning prices across 5 neighbouring weekly rural markets.",
        sector: "Livelihood",
        theme: "Market Access",
        district: "Lohardaga"
      },
      {
        title: "Disaster Shelter Power Backup using Repurposed Li-ion Packs",
        description: "Second-life battery systems assembled from scrapped laptops to power VHF radios during flash flood isolations.",
        sector: "Energy",
        theme: "Emergency Preparedness",
        district: "Sahebganj"
      },
      {
        title: "Lac Dye Extraction and Non-Toxic Mordanting Process",
        description: "Standardized herbal solvent tanks replacing heavy-metal chemical mordants for village textile dying circles.",
        sector: "Livelihood",
        theme: "Sustainable Textiles",
        district: "Khunti"
      },
      {
        title: "Municipal Compost Quality Spectrometer",
        description: "Rapid optical moisture and carbon-nitrogen ratio probe to certify city solid waste compost for farming.",
        sector: "Environment",
        theme: "Solid Waste",
        district: "Ranchi"
      },
      {
        title: "Stone Quarry Blast Vibration Logger for Mud Dwellings",
        description: "Low-cost accelerometers mounted on mud brick walls logging vibration levels to enforce safety setback limits.",
        sector: "Infrastructure",
        theme: "Structural Safety",
        district: "Pakur"
      },
      {
        title: "Gram Panchayat Resolution Digital Ledger and Public Kiosk",
        description: "Touchscreen e-ink noticeboards displaying audited village development resolutions without paper waste.",
        sector: "Governance",
        theme: "Grassroots Democracy",
        district: "Giridih"
      },
      {
        title: "Chhau Dance Mask Ergonomics and Lightweight Resin Formulations",
        description: "Eco-friendly papier-mâché and natural resin composites reducing mask neck strain for folk performers.",
        sector: "Livelihood",
        theme: "Cultural Preservation",
        district: "Saraikela Kharsawan"
      },
      {
        title: "Solar Water Pumping Inverter Diagnostics via GSM",
        description: "Retrofit diagnostic dongles messaging block technicians when agricultural solar pumps experience dry-run faults.",
        sector: "Agriculture",
        theme: "Rural Service Reliability",
        district: "Garhwa"
      }
    ];

    const sampleIssues = challengesRaw.map((ch, idx) => ({
      ...ch,
      submittedBy: userId,
      status: "approved",
      statusHistory: [{ status: "approved", changedBy: userId, note: "Approved for community engagement" }],
      updates: [],
      createdAt: new Date(Date.now() - idx * (1000 * 60 * 60 * 12)) // Staggered by 12 hours
    }));

    await Issue.deleteMany({});
    await Issue.insertMany(sampleIssues);

    console.log(`Successfully seeded ${sampleIssues.length} approved issues into MongoDB Atlas!`);
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

runSeed();