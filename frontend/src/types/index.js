/**
 * @typedef {'safe'|'semi-critical'|'critical'|'over-exploited'|'unknown'} Classification
 * @typedef {'rising'|'stable'|'falling'} Trend
 * @typedef {'High'|'Moderate'|'Low'|'Insufficient Data'} DataConfidence
 * @typedef {{id:string,stationCode:string,name:string,state:string,district:string,block:string,village:string,latitude:number,longitude:number,elevation:number,agency:string,aquiferType:string,status:'active'|'inactive'|'maintenance',classification:Classification,trend:Trend,currentWaterLevel:number,previousWaterLevel:number,rechargeEstimate:number,lastUpdated:string,dataQualityScore:number,dataConfidence:DataConfidence}} Station
 * @typedef {{id:string,stationId:string,timestamp:string,rawValue:number|null,cleanedValue:number|null,filledValue:number|null,rainfall:number,isAnomaly:boolean,isMissing:boolean,isReconstructed:boolean}} GroundwaterReading
 * @typedef {{stationId:string,timestamp:string,predictedValue:number,lowerBound:number,upperBound:number,modelType:'prophet'|'lstm'}} ForecastPoint
 * @typedef {{id:string,stationId:string,periodStart:string,periodEnd:string,aquiferArea:number,waterLevelFluctuation:number,specificYield:number,rechargeValue:number,calculationMethod:'WTF',calculatedAt:string}} RechargeCalculation
 * @typedef {{id:string,title:string,description:string,stationId?:string,state:string,district:string,severity:'low'|'medium'|'high'|'critical',type:string,status:string,createdAt:string,recommendedAction:string,currentValue?:string,previousValue?:string}} GroundwaterAlert
 * @typedef {{district:string,state:string,classification:Classification,previousClassification:Classification,averageWaterLevel:number,rechargeEstimate:number,trend:Trend,dataCoverage:number,activeAlerts:number,stationCount:number,highRiskBlocks:string[]}} DistrictSummary
 * @typedef {{completeness:number,missingReadings:number,reconstructedReadings:number,anomalies:number,sensorUptime:number,qualityScore:number}} DataQuality
 * @typedef {{id:string,name:string,email:string,role:'public'|'researcher'|'planner',organization?:string}} User
 */

export {};
