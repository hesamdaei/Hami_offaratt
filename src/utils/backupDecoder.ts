import { Driver, AttendanceRecords, StaffMember } from '../types';
import { VehicleItem, DriverDirectoryItem } from './fleetSeedData';
import { ServiceRule } from '../components/OilServiceManagementView';
import { normalizeVehicleOilData } from './maintenanceStandardsConfig';
import latestBackup from '../data/latestBackup.json';

export interface DecodedBackupResult {
  vehicles: VehicleItem[];
  drivers: Driver[];
  driverDirectory: DriverDirectoryItem[];
  records: AttendanceRecords;
  staffMembers: StaffMember[];
  staffRecords: AttendanceRecords;
  rules: Record<string, ServiceRule>;
}

// Raw user backup payload reference for data integrity audit
export const RAW_BACKUP_PAYLOAD = {
  ...latestBackup.data,
  vehicles: (latestBackup.data.vehicles || []).map((v: any) => {
    const norm = normalizeVehicleOilData(v);
    return {
      id: norm.id,
      code: String(norm.code || ''),
      type: norm.vehicleType || 'CAR',
      plate: norm.plateNumber || '',
      insuranceExpiry: norm.insuranceExpiry || '',
      inspectionExpiry: norm.inspectionExpiry || '',
      bodyInsExpiry: norm.bodyInsExpiry || '',
      currentMileage: norm.currentMileage || 0,
      lastChangeMileage: norm.lastChangeMileage || 0,
      lastChangeDate: norm.lastChangeDate || '',
      tripsSinceChange: norm.tripsSinceChange || 0,
      serviceHistory: norm.serviceHistory || [],
    };
  }),
};

/**
 * Universal Decoder: Parses both legacy backups and the latest v4 unified format
 */
export function decodeBackupData(payload: any = latestBackup): DecodedBackupResult {
  const src = payload?.data || payload;
  if (src && (Array.isArray(src.vehicles) || Array.isArray(src.drivers))) {
    const rawVehicles = (Array.isArray(src.vehicles) ? src.vehicles : []) as VehicleItem[];
    return {
      vehicles: rawVehicles.map((v) => normalizeVehicleOilData(v)),
      drivers: (Array.isArray(src.drivers) ? src.drivers : []) as Driver[],
      driverDirectory: (Array.isArray(src.driverDirectory) ? src.driverDirectory : []) as DriverDirectoryItem[],
      records: (src.records || {}) as AttendanceRecords,
      staffMembers: (Array.isArray(src.staffMembers) ? src.staffMembers : []) as StaffMember[],
      staffRecords: (src.staffRecords || {}) as AttendanceRecords,
      rules: (src.serviceRules || src.rules || {}) as Record<string, ServiceRule>,
    };
  }

  // Fallback to latest backup
  const fallbackVehicles = (latestBackup.data.vehicles as unknown as VehicleItem[]) || [];
  return {
    vehicles: fallbackVehicles.map((v) => normalizeVehicleOilData(v)),
    drivers: latestBackup.data.drivers as unknown as Driver[],
    driverDirectory: latestBackup.data.driverDirectory as unknown as DriverDirectoryItem[],
    records: latestBackup.data.records as unknown as AttendanceRecords,
    staffMembers: latestBackup.data.staffMembers as unknown as StaffMember[],
    staffRecords: latestBackup.data.staffRecords as unknown as AttendanceRecords,
    rules: (latestBackup.data.serviceRules || {}) as unknown as Record<string, ServiceRule>,
  };
}

// Pre-decoded dataset immediately ready for application (1405-08-06 latest backup)
export const DECODED_BACKUP: DecodedBackupResult = decodeBackupData(latestBackup);
