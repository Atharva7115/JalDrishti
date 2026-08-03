/**
 * Aquifer Types Seed Script
 * Populate AquiferType using the official GEC Specific Yield recommendations.
 */
export const seedAquifers = async (prisma) => {
  console.log("🌱 Seeding Aquifer Types...");

  const aquifers = [
    // --- Alluvial ---
    {
      name: "Sandy Alluvium",
      geologyCode: "AL_SANDY",
      description: "Alluvial formation with dominant sandy lithology.",
      specificYield: 0.16,
      minSpecificYield: 0.12,
      maxSpecificYield: 0.20,
    },
    {
      name: "Silty Alluvium",
      geologyCode: "AL_SILTY",
      description: "Alluvial formation with dominant silty lithology.",
      specificYield: 0.10,
      minSpecificYield: 0.08,
      maxSpecificYield: 0.12,
    },
    {
      name: "Clayey Alluvium",
      geologyCode: "AL_CLAYEY",
      description: "Alluvial formation with dominant clayey lithology.",
      specificYield: 0.06,
      minSpecificYield: 0.04,
      maxSpecificYield: 0.08,
    },
    // --- Hard Rock ---
    {
      name: "Weathered Granite/Gneiss/Schist (Low Clay)",
      geologyCode: "HR_GRANITE_LC",
      description: "Weathered crystalline hard rock with low clay content.",
      specificYield: 0.03,
      minSpecificYield: 0.02,
      maxSpecificYield: 0.04,
    },
    {
      name: "Weathered Granite/Gneiss/Schist (High Clay)",
      geologyCode: "HR_GRANITE_HC",
      description: "Weathered crystalline hard rock with high clay content.",
      specificYield: 0.015,
      minSpecificYield: 0.01,
      maxSpecificYield: 0.02,
    },
    {
      name: "Weathered/Vesicular Jointed Basalt",
      geologyCode: "HR_BASALT",
      description: "Basaltic hard rock (Deccan Traps) with weathered or vesicular jointing.",
      specificYield: 0.02,
      minSpecificYield: 0.01,
      maxSpecificYield: 0.03,
    },
    {
      name: "Laterite",
      geologyCode: "HR_LATERITE",
      description: "Highly weathered, iron and aluminum rich lateritic rock.",
      specificYield: 0.025,
      minSpecificYield: 0.02,
      maxSpecificYield: 0.03,
    },
    {
      name: "Sandstone",
      geologyCode: "HR_SANDSTONE",
      description: "Sedimentary sandstone formation.",
      specificYield: 0.03,
      minSpecificYield: 0.01,
      maxSpecificYield: 0.05,
    },
    {
      name: "Quartzite",
      geologyCode: "HR_QUARTZITE",
      description: "Metamorphic quartzite rock.",
      specificYield: 0.015,
      minSpecificYield: 0.01,
      maxSpecificYield: 0.02,
    },
    {
      name: "Limestone",
      geologyCode: "HR_LIMESTONE",
      description: "Sedimentary limestone formation.",
      specificYield: 0.02,
      minSpecificYield: 0.01,
      maxSpecificYield: 0.03,
    },
    {
      name: "Karstified Limestone",
      geologyCode: "HR_KARST",
      description: "Limestone formation featuring karstic solution cavities.",
      specificYield: 0.08,
      minSpecificYield: 0.05,
      maxSpecificYield: 0.15,
    },
    {
      name: "Phyllite/Shale",
      geologyCode: "HR_SHALE",
      description: "Foliated metamorphic phyllite or sedimentary shale rock.",
      specificYield: 0.015,
      minSpecificYield: 0.01,
      maxSpecificYield: 0.02,
    },
    {
      name: "Massive Poorly Fractured Rock",
      geologyCode: "HR_MASSIVE",
      description: "Massive hard rock with poor fracturing and low permeability.",
      specificYield: 0.003,
      minSpecificYield: 0.001,
      maxSpecificYield: 0.005,
    },
  ];

  for (const aquifer of aquifers) {
    await prisma.aquiferType.upsert({
      where: { name: aquifer.name },
      update: {
        geologyCode: aquifer.geologyCode,
        description: aquifer.description,
        specificYield: aquifer.specificYield,
        minSpecificYield: aquifer.minSpecificYield,
        maxSpecificYield: aquifer.maxSpecificYield,
      },
      create: aquifer,
    });
  }

  console.log(`✅ Successfully seeded ${aquifers.length} Aquifer Types.`);
};
