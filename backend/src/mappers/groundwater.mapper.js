export const mapStation = (record) => ({
  stationName: record["Station"],
  agency: record["Agency"],

  state: record["State"],
  stateLGDCode: record["State LGD Code"],

  district: record["District"],
  districtLGDCode: record["District LGD Code"],

  tehsil: record["Tehsil"] === "-" ? null : record["Tehsil"],
  block: record["Block"] === "-" ? null : record["Block"],
  village: record["Village"] === "-" ? null : record["Village"],

  river: record["River"] === "-" ? null : record["River"],
  basin: record["Basin"] === "-" ? null : record["Basin"],

  tributary:
    record["Tributary"] === "-" ? null : record["Tributary"],

  subTributary:
    record["Subtributary"] === "-"
      ? null
      : record["Subtributary"],

  subSubTributary:
    record["SubSubtributary"] === "-"
      ? null
      : record["SubSubtributary"],

  localRiver:
    record["Local River"] === "-"
      ? null
      : record["Local River"],

  latitude: Number(record["Latitude"]),

  longitude: Number(record["Longitude"]),

  rlMsl:
    record["RL_MSL"] === "-"
      ? null
      : Number(record["RL_MSL"]),
});


export const mapReading = (record, stationId) => ({
  stationId,

  timestamp: parseDate(record["Data Acquisition Time"]),

  rawWaterLevel: Number(
    record["Groundwater Level Telemetry 6 Hourly (meter)"]
  ),

  cleanedWaterLevel: null,

  dataSource: "NWDP",
});


const parseDate = (dateString) => {
  const [datePart, timePart] = dateString.split(" ");

  const [day, month, year] = datePart.split("-");

  return new Date(`${year}-${month}-${day}T${timePart}:00`);
};