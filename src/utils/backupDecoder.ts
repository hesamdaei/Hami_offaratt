import { Driver, AttendanceRecords, StaffMember } from '../types';
import { VehicleItem, DriverDirectoryItem } from './fleetSeedData';
import { ServiceRule } from '../components/OilServiceManagementView';
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
  vehicles: (latestBackup.data.vehicles || []).map((v: any) => ({
    id: v.id,
    code: String(v.code || ''),
    type: v.vehicleType || 'CAR',
    plate: v.plateNumber || '',
    insuranceExpiry: v.insuranceExpiry || '',
    inspectionExpiry: v.inspectionExpiry || '',
    bodyInsExpiry: v.bodyInsExpiry || '',
    currentMileage: v.currentMileage || 0,
    lastChangeMileage: v.lastChangeMileage || 0,
    lastChangeDate: v.lastChangeDate || '',
    tripsSinceChange: v.tripsSinceChange || 0,
    serviceHistory: v.serviceHistory || [],
  })),
};

/**
 * Universal Decoder: Parses both legacy backups and the latest v4 unified format
 */
export function decodeBackupData(payload: any = latestBackup): DecodedBackupResult {
  const src = payload?.data || payload;
  if (src && (Array.isArray(src.vehicles) || Array.isArray(src.drivers))) {
    return {
      vehicles: (Array.isArray(src.vehicles) ? src.vehicles : []) as VehicleItem[],
      drivers: (Array.isArray(src.drivers) ? src.drivers : []) as Driver[],
      driverDirectory: (Array.isArray(src.driverDirectory) ? src.driverDirectory : []) as DriverDirectoryItem[],
      records: (src.records || {}) as AttendanceRecords,
      staffMembers: (Array.isArray(src.staffMembers) ? src.staffMembers : []) as StaffMember[],
      staffRecords: (src.staffRecords || {}) as AttendanceRecords,
      rules: (src.serviceRules || src.rules || {}) as Record<string, ServiceRule>,
    };
  }

  // Fallback to latest backup
  return {
    vehicles: latestBackup.data.vehicles as unknown as VehicleItem[],
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
